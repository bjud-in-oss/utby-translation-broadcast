import path from 'path';
import fs from 'fs';
import { verifyTypeScriptCodebase } from '../drivers/ts.js';

export function runTsRules() {
  const ROOT_DIR = process.cwd();
  const SRC_DIR = path.join(ROOT_DIR, 'src');
  const LAST_CYCLE_DIR = path.join(ROOT_DIR, 'doc', 'LAST_CYCLE');
  const p3cPath = path.join(LAST_CYCLE_DIR, '3c_fil_operativ_kallkodsspecifikation.md');
  const p4Path = path.join(LAST_CYCLE_DIR, '4_producera.md');

  const t3c = fs.existsSync(p3cPath) ? fs.statSync(p3cPath).mtimeMs : 0;
  const t4 = fs.existsSync(p4Path) ? fs.statSync(p4Path).mtimeMs : 0;

  let errors = 0;
  const logError = (title, msg) => {
    console.error(`❌ [${title}] ${msg}`);
    errors++;
  };

  verifyTypeScriptCodebase({
    ROOT_DIR,
    SRC_DIR,
    t3c,
    logError,
    t4
  });

  return errors === 0;
}
