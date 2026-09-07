import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

const { GH_USER, GH_PAT, GH_REPO } = process.env;

if (!GH_PAT || !GH_USER || !GH_REPO) {
  console.error('❌ Saknar GH_PAT, GH_USER eller GH_REPO i Secrets / miljövariabler.');
  process.exit(1);
}

const remoteUrl = `https://${GH_USER}:${GH_PAT}@${GH_REPO}`;

try {
  // Tvinga anonym Git-identitet
  execSync('git config user.name "AI Studio Agent"', { stdio: 'inherit' });
  execSync('git config user.email "noreply@github.com"', { stdio: 'inherit' });
  
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "auto: cykel genomförd via AI Studio"', { stdio: 'inherit' });
  execSync(`git push ${remoteUrl} main`, { stdio: 'inherit' });
  console.log('🚀 Ändringarna har pushats anonymt till GitHub!');
} catch (error) {
  console.error('❌ Push misslyckades:', error.message);
}