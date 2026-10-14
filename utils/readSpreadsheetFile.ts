/**
 * Reads a spreadsheet the organizer picked in the browser (web build only).
 *
 * .csv / .txt / .tsv come back as text for parsePlayerText. .xlsx comes back
 * as a grid of cells from the FIRST sheet. An .xlsx is a zip of XML files, and
 * every modern browser can inflate it with DecompressionStream, so this needs
 * no spreadsheet library in the bundle. The old binary .xls format is not
 * readable this way; the caller tells the organizer to save as .xlsx or CSV.
 */

export type SheetContent = { kind: 'text'; text: string } | { kind: 'grid'; grid: string[][] };

interface ZipEntry { name: string; method: number; compSize: number; localOffset: number }

function readZipDirectory(buf: ArrayBuffer): ZipEntry[] {
  const v = new DataView(buf);
  // End of central directory: last 22+ bytes, signature 0x06054b50.
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const compSize = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const localOffset = v.getUint32(p + 42, true);
    const name = String.fromCharCode(...Array.from(new Uint8Array(buf, p + 46, nameLen)));
    entries.push({ name, method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function readZipText(buf: ArrayBuffer, e: ZipEntry): Promise<string> {
  const v = new DataView(buf);
  const nameLen = v.getUint16(e.localOffset + 26, true);
  const extraLen = v.getUint16(e.localOffset + 28, true);
  const start = e.localOffset + 30 + nameLen + extraLen;
  const raw = new Uint8Array(buf, start, e.compSize);
  if (e.method === 0) return new TextDecoder().decode(raw);
  if (e.method !== 8) throw new Error('unsupported compression');
  const ds = new (globalThis as any).DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(raw);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return new TextDecoder().decode(out);
}

function colIndex(ref: string): number {
  const letters = (ref.match(/^[A-Z]+/) || ['A'])[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

async function readXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const entries = readZipDirectory(buf);
  const find = (name: string) => entries.find(e => e.name === name);
  const parser = new DOMParser();

  const shared: string[] = [];
  const ssEntry = find('xl/sharedStrings.xml');
  if (ssEntry) {
    const doc = parser.parseFromString(await readZipText(buf, ssEntry), 'application/xml');
    Array.from(doc.getElementsByTagName('si')).forEach(si => {
      shared.push(Array.from(si.getElementsByTagName('t')).map(t => t.textContent || '').join(''));
    });
  }

  // First sheet in workbook order, falling back to sheet1.xml.
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = find('xl/workbook.xml');
  const rels = find('xl/_rels/workbook.xml.rels');
  if (wb && rels) {
    const wbDoc = parser.parseFromString(await readZipText(buf, wb), 'application/xml');
    const first = wbDoc.getElementsByTagName('sheet')[0];
    const rid = first?.getAttribute('r:id') || first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    if (rid) {
      const relDoc = parser.parseFromString(await readZipText(buf, rels), 'application/xml');
      const rel = Array.from(relDoc.getElementsByTagName('Relationship')).find(r => r.getAttribute('Id') === rid);
      const target = rel?.getAttribute('Target');
      if (target) sheetPath = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
    }
  }
  const sheet = find(sheetPath) || entries.find(e => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name));
  if (!sheet) throw new Error('no sheet');

  const doc = parser.parseFromString(await readZipText(buf, sheet), 'application/xml');
  const grid: string[][] = [];
  Array.from(doc.getElementsByTagName('row')).forEach(row => {
    const cells: string[] = [];
    Array.from(row.getElementsByTagName('c')).forEach(c => {
      const idx = colIndex(c.getAttribute('r') || '');
      const type = c.getAttribute('t');
      let val = '';
      if (type === 'inlineStr') {
        val = Array.from(c.getElementsByTagName('t')).map(t => t.textContent || '').join('');
      } else {
        const vEl = c.getElementsByTagName('v')[0];
        val = vEl?.textContent || '';
        if (type === 's') val = shared[parseInt(val, 10)] || '';
      }
      cells[idx] = val;
    });
    grid.push(Array.from(cells, c => c || ''));
  });
  return grid;
}

export async function readSpreadsheetFile(file: File): Promise<SheetContent> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xls')) {
    throw new Error('That is an older Excel file (.xls). In Excel, choose File > Save As and pick .xlsx or CSV, then try again.');
  }
  if (lower.endsWith('.xlsx')) {
    try {
      return { kind: 'grid', grid: await readXlsx(await file.arrayBuffer()) };
    } catch {
      throw new Error("We couldn't read that spreadsheet. Try saving it as CSV, or copy the cells and paste them instead.");
    }
  }
  return { kind: 'text', text: await file.text() };
}
