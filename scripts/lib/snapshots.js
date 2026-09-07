import fs from 'fs';
import path from 'path';

const LAST_CYCLE_DIR = path.join(process.cwd(), 'doc', 'LAST_CYCLE');
const SNAPSHOT_DIR = path.join(LAST_CYCLE_DIR, 'snapshots', 'pre_step4');

/**
 * Rensa tidigare snapshots vid ny cykelstart.
 */
export function purgeObsoleteSnapshots() {
  if (!fs.existsSync(SNAPSHOT_DIR)) return;
  const files = fs.readdirSync(SNAPSHOT_DIR);
  files.forEach((file) => {
    fs.unlinkSync(path.join(SNAPSHOT_DIR, file));
  });
}

/**
 * Skapa säkerhetskopior av källkodsfiler deklarerade i Steg 3c.
 */
export function createPreStep4Snapshots(filePaths) {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
  filePaths.forEach((relPath) => {
    const fullPath = path.join(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      const fileName = path.basename(relPath);
      fs.copyFileSync(fullPath, path.join(SNAPSHOT_DIR, fileName));
    }
  });
}
