import { parseGrid, parsePlayerText, splitExisting, tidyName } from '../utils/playerImport';

describe('player list import', () => {
  test('names on their own lines, no gender: every row needs a pick', () => {
    const { rows } = parsePlayerText('Jane Smith\nBob Jones\n\nMaria Lopez\n');
    expect(rows).toEqual([
      { name: 'Jane Smith', gender: null },
      { name: 'Bob Jones', gender: null },
      { name: 'Maria Lopez', gender: null },
    ]);
  });

  test('cells copied from a spreadsheet (tab separated) with a header row', () => {
    const { rows } = parsePlayerText('Name\tGender\nJane Smith\tFemale\nBob Jones\tMale\n');
    expect(rows).toEqual([
      { name: 'Jane Smith', gender: 'female' },
      { name: 'Bob Jones', gender: 'male' },
    ]);
  });

  test('comma, trailing letter, leading letter, bullets and numbers', () => {
    const { rows } = parsePlayerText('1. Jane Smith, F\n- bob jones M\n• W Ana Ruiz\n2) Tom Lee (m)\nKIM PARK, woman');
    expect(rows).toEqual([
      { name: 'Jane Smith', gender: 'female' },
      { name: 'Bob Jones', gender: 'male' },
      { name: 'Ana Ruiz', gender: 'female' },
      { name: 'Tom Lee', gender: 'male' },
      { name: 'Kim Park', gender: 'female' },
    ]);
  });

  test('"Last, First" with no gender stays one person', () => {
    expect(parsePlayerText('Smith, Jane').rows).toEqual([{ name: 'Jane Smith', gender: null }]);
  });

  test('a name that merely starts with M or F is not read as a gender', () => {
    expect(parsePlayerText('Mike\nFrank\nMary Ann').rows.map(r => r.gender)).toEqual([null, null, null]);
  });

  test('first and last in separate columns, extra email and phone columns ignored', () => {
    const { rows } = parseGrid([
      ['First Name', 'Last Name', 'Gender'],
      ['jane', 'smith', 'F', 'jane@x.com', '555-1234'],
      ['Bob', 'Jones', 'M'],
    ]);
    expect(rows).toEqual([
      { name: 'Jane Smith', gender: 'female' },
      { name: 'Bob Jones', gender: 'male' },
    ]);
  });

  test('the same name twice is kept once and reported', () => {
    const r = parsePlayerText('Jane\njane\nBob');
    expect(r.rows.map(x => x.name)).toEqual(['Jane', 'Bob']);
    expect(r.duplicates).toEqual(['Jane']);
  });

  test('people already in the group are skipped, case-insensitively', () => {
    const { fresh, already } = splitExisting(
      [{ name: 'Jane Smith', gender: 'female' }, { name: 'Bob', gender: 'male' }],
      ['jane smith'],
    );
    expect(fresh.map(r => r.name)).toEqual(['Bob']);
    expect(already.map(r => r.name)).toEqual(['Jane Smith']);
  });

  test('first names that look like words are kept (Guy, Lady, Man Ray)', () => {
    expect(parsePlayerText('Guy Smith\nLady Jones F\nMan Ray').rows).toEqual([
      { name: 'Guy Smith', gender: null },
      { name: 'Lady Jones', gender: 'female' },
      { name: 'Man Ray', gender: null },
    ]);
    expect(parseGrid([['Guy', 'Smith', 'M']]).rows).toEqual([{ name: 'Guy Smith', gender: 'male' }]);
  });

  test('tidyName keeps hyphens and apostrophes readable', () => {
    expect(tidyName("mary-kate o'brien")).toBe("Mary-Kate O'Brien");
  });
});
