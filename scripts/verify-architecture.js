import { 
  purgeObsoleteBranchFiles, 
  readActiveVectors, 
  validateCycleSequence, 
  validateTokenGate, 
  runParallelBackgroundChecks 
} from './lib/cycle-steps.js';
import { purgeObsoleteSnapshots } from './lib/snapshots.js';
import { cleanClosedTickets } from './lib/utils.js';
import { runTsRules } from './lib/ts-rules.js';

async function main() {
  console.log('🔍 Exekverar verifiering (v9.7)...');

  // 1. Tillståndsrening vid cykelstart
  purgeObsoleteBranchFiles();
  purgeObsoleteSnapshots();

  // 2. Sekvensvalidering för linjärt/förgrenat läge
  const seq = validateCycleSequence();
  if (!seq.valid) {
    console.error(`❌ Sekvensfel: ${seq.error}`);
    process.exit(1);
  }
  console.log(`✅ Sekvens godkänd (${seq.mode}-läge, Vektorer: [${seq.vectors.join(', ')}])`);

  // 3. Parallella API-kontroller i bakgrunden
  const bg = await runParallelBackgroundChecks(seq.vectors);
  if (bg.executed) {
    console.log(`⚡ Parallella bakgrundskontroller utförda för ${bg.results.length} vektorer.`);
  }

  // 4. TypeScript-kompilation och typvalidering
  const tsOk = runTsRules();
  if (!tsOk) {
    console.error('❌ TypeScript-validering misslyckades.');
    process.exit(1);
  }

  // 5. Automatisk biljettrening vid cykelavslut
  cleanClosedTickets();

  console.log('🚀 Verifiering fullbordad utan anmärkningar!');
}

main();
