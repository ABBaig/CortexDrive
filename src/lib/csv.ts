export type CSVRow = Record<string, string>;

// Small robust CSV parser that handles quoted fields and CRLF. Returns array of rows keyed by header.
export function parseCSV(text: string): CSVRow[] {
  const rows: CSVRow[] = [];
  if (!text) return rows;
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return rows;

  function parseLine(line: string) {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // handle escaped quote
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  const header = parseLine(lines[0]).map((h) => h.trim());
  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    // allow short lines by padding
    while (fields.length < header.length) fields.push('');
    const obj: CSVRow = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = (fields[j] ?? '').trim();
    }
    rows.push(obj);
  }
  return rows;
}
