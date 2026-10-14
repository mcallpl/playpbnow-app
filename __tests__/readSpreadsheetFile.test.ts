/**
 * @jest-environment jsdom
 */
import * as fs from 'fs';
import * as path from 'path';
import { readSpreadsheetFile } from '../utils/readSpreadsheetFile';
import { parseGrid } from '../utils/playerImport';

// jsdom lacks the browser streaming APIs every modern browser has; borrow Node's.
const web = require('stream/web');
(globalThis as any).DecompressionStream = web.DecompressionStream;
(globalThis as any).TextDecoder = (globalThis as any).TextDecoder || require('util').TextDecoder;

function fakeFile(p: string, name: string): File {
  const bytes = fs.readFileSync(p);
  return {
    name,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    text: async () => bytes.toString('utf8'),
  } as unknown as File;
}

test('reads the first sheet of a real Excel file', async () => {
    const content = await readSpreadsheetFile(fakeFile(path.join(__dirname, 'fixtures/roster.xlsx'), 'roster.xlsx'));
    expect(content.kind).toBe('grid');
    const { rows } = parseGrid((content as any).grid);
    expect(rows).toEqual([
      { name: 'Jane Smith', gender: 'female' },
      { name: 'Bob Jones', gender: 'male' },
      { name: 'Maria Lopez', gender: null },
      { name: 'Tom Lee', gender: 'male' },
    ]);
});

test('an old .xls file gets plain instructions, not a crash', async () => {
  await expect(readSpreadsheetFile({ name: 'old.xls' } as File)).rejects.toThrow(/Save As/);
});
