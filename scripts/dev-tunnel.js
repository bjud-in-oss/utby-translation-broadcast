require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');
const { Octokit } = require('@octokit/rest');

// Konfiguration för ditt GitHub Redirect Repo
const GITHUB_OWNER = 'bjud-in-oss';
const GITHUB_REPO = 'utby-translate';
const FILE_PATH = 'index.html';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

console.log('🚀 Startar Cloudflare Tunnel...');
const tunnel = spawn('npx', ['cloudflared', 'tunnel', '--url', 'http://127.0.0.1:3000'], { shell: true });

let urlFound = false;

const updateGitHubRedirect = async (targetUrl) => {
  try {
    console.log(`📡 Uppdaterar GitHub Redirect till: ${targetUrl}`);
    
    let sha;
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: FILE_PATH,
      });
      sha = data.sha;
    } catch (e) {
      // Filen saknas eller är ny
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${targetUrl}">
  <title>Omdirigerar...</title>
  <script>window.location.href = "${targetUrl}";</script>
</head>
<body>
  <p>Omdirigerar till översättningen: <a href="${targetUrl}">${targetUrl}</a></p>
</body>
</html>`;

    const contentEncoded = Buffer.from(htmlContent).toString('base64');

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
      message: `auto: uppdatera tunnel redirect till ${targetUrl}`,
      content: contentEncoded,
      sha: sha,
    });

    console.log('✅ GitHub-omdirigering uppdaterad!');
  } catch (error) {
    console.error('❌ Fel vid uppdatering av GitHub:', error.message);
  }
};

const handleOutput = (data) => {
  const output = data.toString();
  console.log(output);

  const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);

  if (match && !urlFound) {
    urlFound = true;
    const tunnelUrl = match[0];
    const targetWatchUrl = `${tunnelUrl}/session/utby/watch`;

    console.log(`\n==================================================`);
    console.log(`✅ Ny Cloudflare URL hittad: ${tunnelUrl}`);
    console.log(`🎯 Mål-URL: ${targetWatchUrl}`);
    console.log(`==================================================\n`);

    updateGitHubRedirect(targetWatchUrl);
  }
};

tunnel.stdout.on('data', handleOutput);
tunnel.stderr.on('data', handleOutput);