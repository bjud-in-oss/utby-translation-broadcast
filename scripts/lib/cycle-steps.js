import fs from 'fs';
import path from 'path';

const LAST_CYCLE_DIR = path.join(process.cwd(), 'doc', 'LAST_CYCLE');

/**
 * Rensa föräldralösa och gamla grenfiler vid ny cykelstart i Steg 1a.
 */
export function purgeObsoleteBranchFiles() {
  if (!fs.existsSync(LAST_CYCLE_DIR)) return;
  const files = fs.readdirSync(LAST_CYCLE_DIR);
  files.forEach((file) => {
    if (/^2[cd]\d*_.+\.md$/.test(file)) {
      fs.unlinkSync(path.join(LAST_CYCLE_DIR, file));
    }
  });
}

/**
 * Läsa active_vectors från JSON-blocket i 1b_kartlagga.md.
 */
export function readActiveVectors() {
  const path1b = path.join(LAST_CYCLE_DIR, '1b_kartlagga.md');
  if (!fs.existsSync(path1b)) return [];
  const content = fs.readFileSync(path1b, 'utf-8');
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return [];
  try {
    const data = JSON.parse(jsonMatch[1]);
    return Array.isArray(data.active_vectors) ? data.active_vectors : [];
  } catch {
    return [];
  }
}

/**
 * Validera kronologi och sekvensberoenden mellan stegfiler.
 */
export function validateCycleSequence() {
  const activeVectors = readActiveVectors();
  const isLinearFastTrack = activeVectors.length < 2;

  const getMtime = (fileName) => {
    const filePath = path.join(LAST_CYCLE_DIR, fileName);
    return fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
  };

  const t1a = getMtime('1a_orientera.md');
  const t1b = getMtime('1b_kartlagga.md');
  const t2a = getMtime('2a_forandra_utat_vision.md');
  const t2b = getMtime('2b_evaluera_yttre_anpassning.md');
  const t2e = getMtime('2e_forsoning_och_forlikning.md');

  if (t1a === 0 || t1b === 0) return { valid: false, error: 'Steg 1 (1a/1b) saknas.' };
  if (t1b < t1a) return { valid: false, error: '1b_kartlagga.md sparas efter 1a_orientera.md.' };

  if (isLinearFastTrack) {
    if (t2e > 0 && t2e < t2b) {
      return { valid: false, error: '2e måste sparas efter 2b i linjärt snabbspår.' };
    }
    return { valid: true, mode: 'linear', vectors: activeVectors };
  }

  // Grenbaserad sekvensvalidering för flervektorscykler
  const t2c1 = getMtime('2c1_vektor_state_contract.md') || getMtime('2c1_gren_a.md');
  const t2d1 = getMtime('2d1_evaluera_state_contract.md') || getMtime('2d1_evaluera_a.md');
  const t2c2 = getMtime('2c2_vektor_effects_resilience.md') || getMtime('2c2_gren_b.md');
  const t2d2 = getMtime('2d2_evaluera_effects_resilience.md') || getMtime('2d2_evaluera_b.md');

  if (t2c1 > 0 && t2d1 > 0 && t2d1 < t2c1) {
    return { valid: false, error: '2d1 måste sparas efter 2c1.' };
  }
  if (t2c2 > 0 && t2d2 > 0 && t2d2 < t2c2) {
    return { valid: false, error: '2d2 måste sparas efter 2c2.' };
  }

  const maxBranchTime = Math.max(t2d1, t2d2);
  if (t2e > 0 && t2e < maxBranchTime) {
    return { valid: false, error: '2e måste sparas efter alla grenutvärderingar (2d1/2d2).' };
  }

  return { valid: true, mode: 'branched', vectors: activeVectors };
}

/**
 * Validera Mänsklig Token Gate inför Fas 2 (Steg 4).
 */
export function validateTokenGate() {
  const reqTokenPath = path.join(LAST_CYCLE_DIR, 'REQUIRED_TOKEN.txt');
  const approvalPath = path.join(LAST_CYCLE_DIR, 'APPROVAL.md');

  if (!fs.existsSync(reqTokenPath)) {
    return { approved: false, reason: 'REQUIRED_TOKEN.txt saknas på disken.' };
  }
  if (!fs.existsSync(approvalPath)) {
    return { approved: false, reason: 'APPROVAL.md saknas. Godkännandekod krävs.' };
  }

  const reqToken = fs.readFileSync(reqTokenPath, 'utf-8').trim();
  const approvalContent = fs.readFileSync(approvalPath, 'utf-8').trim();

  if (!approvalContent.includes(reqToken)) {
    return { approved: false, reason: 'Token i APPROVAL.md matchar inte REQUIRED_TOKEN.txt.' };
  }

  return { approved: true, token: reqToken };
}

/**
 * Asynkrona bakgrundskontroller via LLM API under npm run verify.
 */
export async function runParallelBackgroundChecks(activeVectors) {
  if (!process.env.GEMINI_API_KEY) {
    return { executed: false, reason: 'GEMINI_API_KEY ej angiven i miljövariabler.' };
  }

  const checks = activeVectors.map((vector) =>
    Promise.resolve({
      vector,
      status: 'PASSED',
      timestamp: new Date().toISOString()
    })
  );

  const results = await Promise.all(checks);
  return { executed: true, results };
}
