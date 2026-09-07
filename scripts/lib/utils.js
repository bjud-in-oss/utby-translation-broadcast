import fs from 'fs';
import path from 'path';

const TICKETS_PATH = path.join(process.cwd(), 'doc', 'TICKETS.md');

/**
 * Rensa avslutade biljetter ur doc/TICKETS.md vid cykelavslut.
 */
export function cleanClosedTickets() {
  if (!fs.existsSync(TICKETS_PATH)) return;
  const content = fs.readFileSync(TICKETS_PATH, 'utf-8');
  const lines = content.split('\n');
  
  const activeLines = lines.filter((line) => {
    const isTicketRow = /^\|\s*`?TCK-\d+`?/.test(line);
    if (!isTicketRow) return true;
    return !line.includes('Closed');
  });

  fs.writeFileSync(TICKETS_PATH, activeLines.join('\n'), 'utf-8');
}
