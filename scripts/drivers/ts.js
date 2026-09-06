/**
 * TYPESCRIPT & FSD DRIVRUTIN (v9.4)
 * Verifierar domängränser, fasadexporter, linjekvoter, AI-isolering, TDD-ordning, Zod-scheman och felhantering.
 */
import fs from 'fs';
import path from 'path';

export async function verifyTypeScriptCodebase({
  ROOT_DIR,
  SRC_DIR,
  t3c,
  logError,
  t4
}) {
  const featuresDir = path.join(SRC_DIR, 'features');
  const LAST_CYCLE_DIR = path.join(ROOT_DIR, 'doc', 'LAST_CYCLE');
  const SNAPSHOT_DIR = path.join(LAST_CYCLE_DIR, 'snapshots', 'pre_step4');
  const p3cPath = path.join(LAST_CYCLE_DIR, '3c_fil_operativ_kallkodsspecifikation.md');
  const p1aPath = path.join(LAST_CYCLE_DIR, '1a_orientera.md');
  
  const p3cContent = fs.existsSync(p3cPath) ? fs.readFileSync(p3cPath, 'utf-8') : '';
  const t1a = fs.existsSync(p1aPath) ? fs.statSync(p1aPath).mtimeMs : 0;

  // 1. PROAKTIV DOMÄNKONTROLL I 3C (Max 1 domän)
  if (p3cContent) {
    const featureMatches = p3cContent.match(/src\/features\/([a-zA-Z0-9_]+)\//g) || [];
    const domainsIn3c = new Set(featureMatches.map(m => m.split('/')[2]));
    if (domainsIn3c.size > 1) {
      logError('DOMÄNÖVERTRÄDELSE (MAX 1 DOMÄN INOM 3C)', `Specifikationen i 3c berör ${domainsIn3c.size} domäner samtidigt (${Array.from(domainsIn3c).join(', ')}). Dela upp i separata cykler.`);
    }
  }

  // 2. DOMÄN-, FASAD- OCH DOKUMENTATIONSSKANNING UNDER src/features/
  if (fs.existsSync(featuresDir)) {
    for (const domain of fs.readdirSync(featuresDir)) {
      const domainPath = path.join(featuresDir, domain);
      if (!fs.statSync(domainPath).isDirectory()) continue;

      const indexPath = path.join(domainPath, 'index.ts');
      if (fs.existsSync(indexPath)) {
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        if (/export\s+\*\s+from/i.test(indexContent)) {
          logError('FASAD-ÖVERTRÄDELSE', `${path.relative(ROOT_DIR, indexPath)} använder "export *". Använd explicita namngivna exporter.`);
        }
      }

      const localDocDir = path.join(domainPath, 'doc');
      if (fs.existsSync(localDocDir)) {
        for (const docFile of fs.readdirSync(localDocDir)) {
          const docPath = path.join(localDocDir, docFile);
          if (docFile.endsWith('.md') && fs.statSync(docPath).isFile()) {
            const lineCount = fs.readFileSync(docPath, 'utf-8').split('\n').length;
            if (lineCount > 40) {
              logError('DOKUMENTATIONSSKULD', `${path.relative(ROOT_DIR, docPath)} omfattar ${lineCount} rader. Max 40 rader tillåts. Banta ner texten eller flytta regler till domain/schema.ts.`);
            }
          }
        }
      }

      const sanitizerPath = path.join(domainPath, 'domain', 'ai_zones', 'sanitizer.ts');
      if (fs.existsSync(sanitizerPath)) {
        const content = fs.readFileSync(sanitizerPath, 'utf-8');
        if (/\b(window|document|localStorage|sessionStorage|fetch)\b/.test(content)) {
          logError('SÄKERHETSZON-ÖVERTRÄDELSE', `${path.relative(ROOT_DIR, sanitizerPath)} läcker globala API:er.`);
        }
      }
    }
  }

  // 3. SKANNING AV KÄLLKOD OCH TESTER UNDER src/
  if (fs.existsSync(SRC_DIR)) {
    let oldestTestTime = Infinity, oldestProdCodeTime = Infinity;
    let newestProdCodeTime = 0, newestTestTime = 0;
    const modifiedDomains = new Set();

    const scanSrc = (dir) => {
      for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanSrc(fullPath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const relPath = path.relative(SRC_DIR, fullPath);
          const isTsx = file.endsWith('.tsx');
          const lineCount = content.split('\n').length;
          const isTest = file.includes('__tests__') || file.endsWith('.test.ts') || file.endsWith('.test.tsx');

          // FAS 1-SPÄRR: Identifiera källkodsändringar utförda före Steg 4
          if (t4 === 0 && t1a > 0 && stat.mtimeMs > t1a) {
            logError('KÄLLKODSÄNDRING I FAS 1', `Filen "${relPath}" redigerades under planeringsfasen. Bevara källkoden i src/ orörd fram till Steg 4.`);
          }

          const isModifiedAfter3c = stat.mtimeMs > t3c;

          if (isModifiedAfter3c && t4 > 0) {
            if (relPath.startsWith('features' + path.sep)) {
              const domName = relPath.split(path.sep)[1];
              if (domName) modifiedDomains.add(`feature:${domName}`);
            } else if (relPath.startsWith('server' + path.sep)) {
              modifiedDomains.add('server');
            } else {
              modifiedDomains.add('core');
            }

            if (p3cContent && !p3cContent.includes(relPath) && !p3cContent.includes(file)) {
              logError('MANIFESTÖVERTRÄDELSE', `Filen "${relPath}" modifierades i Steg 4 men saknas i 3c. Speca filen i 3c först.`);
            }

            const snapFilePath = path.join(SNAPSHOT_DIR, path.basename(fullPath));
            if (fs.existsSync(snapFilePath)) {
              const oldContent = fs.readFileSync(snapFilePath, 'utf-8');
              const oldPropMatches = oldContent.match(/interface\s+[A-Za-z0-9_]*Props[\s\S]*?\}|type\s+[A-Za-z0-9_]*Props\s*=\s*\{[\s\S]*?\}/g) || [];
              const newPropMatches = content.match(/interface\s+[A-Za-z0-9_]*Props[\s\S]*?\}|type\s+[A-Za-z0-9_]*Props\s*=\s*\{[\s\S]*?\}/g) || [];

              if (oldPropMatches.length > 0 && newPropMatches.length > 0) {
                const extractKeys = (str) => (str.match(/\b([a-zA-Z0-9_]+)\s*\??\s*:/g) || []).map(k => k.split('?')[0].split(':')[0].trim());
                const oldKeys = extractKeys(oldPropMatches.join('\n'));
                const newKeys = new Set(extractKeys(newPropMatches.join('\n')));

                const missingKeys = oldKeys.filter(k => !newKeys.has(k) && !['string', 'number', 'boolean', 'any', 'void', 'unknown'].includes(k));
                if (missingKeys.length > 0 && !/BORTTAGEN_PROP|REFAKTORISERAD_PROP/i.test(p3cContent)) {
                  logError('GRÄNSSNITTSREGRESSION', `${path.relative(ROOT_DIR, fullPath)} förlorade prop-nycklar: (${missingKeys.join(', ')}) utan "BORTTAGEN_PROP" i 3c.`);
                }
              }
            }

            const hasAiImport = /(@google\/genai|openai|fetch\(['"]\/api\/ai)/i.test(content);
            const isInsideAiZone = relPath.includes(`domain${path.sep}ai_zones`);
            const isServerCode = path.relative(ROOT_DIR, fullPath).startsWith('server');

            if (hasAiImport && !isInsideAiZone && !isServerCode) {
              logError('AI-ISOLERINGSÖVERTRÄDELSE', `${path.relative(ROOT_DIR, fullPath)} innehåller AI-anrop utanför domain/ai_zones/.`);
            }

            if (isTsx && !isTest) {
              const useStateCount = (content.match(/useState\s*\(/g) || []).length;
              const useEffectCount = (content.match(/useEffect\s*\(/g) || []).length;

              if (useStateCount + useEffectCount > 3) {
                logError('LOGIK-LÄCKAGE', `${path.relative(ROOT_DIR, fullPath)} har ${useStateCount + useEffectCount} hooks. Bryt ut till en custom hook under hooks/.`);
              }

              if (/fetch\s*\(|async\s+\(|axios\./.test(content)) {
                logError('DATAHÄMTNING I UI', `${path.relative(ROOT_DIR, fullPath)} hämtar data i vyn. Flytta till domain/ eller servicelagret.`);
              }

              if (lineCount > 120 && !relPath.includes(`components${path.sep}`)) {
                logError('MODULARISERINGSGRÄNS ÖVERSKRIDEN', `${path.relative(ROOT_DIR, fullPath)} har ${lineCount} rader. UI-vyer får ha max 120 rader. Bryt ut underkomponenter.`);
              }
            }

            if (isTest) {
              if (!/expect\s*\(/.test(content)) {
                logError('TEST UTAN ASSERTIONS', `${path.relative(ROOT_DIR, fullPath)} saknar expect()-påståenden.`);
              }

              if (file.endsWith('.test.tsx') && !/(fireEvent|userEvent|toHaveBeenCalled|getByRole|getByText|click)\b/.test(content)) {
                logError('UI-TEST UTAN INTERAKTION', `${path.relative(ROOT_DIR, fullPath)} saknar interaktionspåståenden (fireEvent/userEvent/click).`);
              }
            }

            if (/: \s*any\b|as\s+any\b/.test(content)) {
              logError('TYPKONTROLL', `${path.relative(ROOT_DIR, fullPath)} använder 'any'.`);
            }

            if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) {
              logError('FELHANTERING SAKNAS', `${path.relative(ROOT_DIR, fullPath)} innehåller ett tomt catch-block. Inkludera aktiv loggning eller felhantering.`);
            }

            if (isTest) {
              if (stat.mtimeMs < oldestTestTime) oldestTestTime = stat.mtimeMs;
              if (stat.mtimeMs > newestTestTime) newestTestTime = stat.mtimeMs;
            } else {
              if (stat.mtimeMs < oldestProdCodeTime) oldestProdCodeTime = stat.mtimeMs;
              if (stat.mtimeMs > newestProdCodeTime) newestProdCodeTime = stat.mtimeMs;
            }

            if (lineCount > 250) {
              logError('STORLEKSGRÄNS ÖVERSKRIDEN', `${path.relative(ROOT_DIR, fullPath)} överstiger 250 rader.`);
            }
          }
        }
      }
    };

    scanSrc(SRC_DIR);

    if (t4 > 0) {
      for (const domKey of modifiedDomains) {
        if (domKey.startsWith('feature:')) {
          const domName = domKey.replace('feature:', '');
          const schemaPath = path.join(featuresDir, domName, 'domain', 'schema.ts');
          const schemaContent = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '';
          if (!fs.existsSync(schemaPath) || !/export\s+const\s+\w+\s*=\s*z\./.test(schemaContent)) {
            logError('KÖRTIDSVALIDERING SAKNAS', `Domänen "${domName}" kräver ett aktivt exporterat Zod-schema i domain/schema.ts.`);
          }
        }
      }
    }

    if (t4 > 0 && modifiedDomains.size > 1) {
      logError('DOMÄNÖVERTRÄDELSE (MAX 1 DOMÄN)', `Ändringar upptäcktes i ${modifiedDomains.size} domäner samtidigt (${Array.from(modifiedDomains).join(', ')}). Dela upp i separata cykler.`);
    }

    if (t4 > 0 && newestProdCodeTime <= t3c && newestTestTime <= t3c) {
      logError('TOM PRODUKTION', '4_producera.md skapades men inga källkods- eller testfiler ändrades efter 3c.');
    }

    if (t4 > 0 && oldestProdCodeTime !== Infinity && oldestTestTime !== Infinity && oldestTestTime > oldestProdCodeTime) {
      logError('TDD-ÖVERTRÄDELSE', 'Produktionskod påbörjades innan enhetstester skapats.');
    }

    if (t4 > 0 && t4 <= newestProdCodeTime) {
      logError('SEKVENSFEL', '4_producera.md sparades innan all källkod var färdigskriven.');
    }
  }
}