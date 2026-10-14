import { parseGrid, parsePlayerText, shortName, shortNames, splitExisting, tidyName } from '../utils/playerImport';

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

  test('comma columns, gender words, bullets and numbers', () => {
    const { rows } = parsePlayerText('1. Jane Smith, F\n- bob jones Male\n• Female Ana Ruiz\n2) Tom Lee (m)\nKIM PARK, woman');
    expect(rows).toEqual([
      { name: 'Jane Smith', gender: 'female' },
      { name: 'Bob Jones', gender: 'male' },
      { name: 'Ana Ruiz', gender: 'female' },
      { name: 'Tom Lee', gender: 'male' },
      { name: 'Kim Park', gender: 'female' },
    ]);
  });

  test('a single letter after a name is a last initial, never a gender', () => {
    expect(parsePlayerText('Kim M\nBeth F\nW Smith\nJane Smith F').rows).toEqual([
      { name: 'Kim M', gender: null },
      { name: 'Beth F', gender: null },
      { name: 'W Smith', gender: null },
      { name: 'Jane Smith F', gender: null },
    ]);
  });

  test('last initials with a gender column, pasted with wide gaps, tabs or commas', () => {
    const expected = [
      { name: 'Dianna M', gender: 'female' },
      { name: 'Ed M', gender: 'male' },
      { name: 'Beth F', gender: 'female' },
      { name: 'Kim M', gender: 'female' },
    ];
    expect(parsePlayerText('Dianna M    Female\nEd M    Male\nBeth F  Female\nKim M    Female').rows).toEqual(expected);
    expect(parsePlayerText('Dianna M\tFemale\nEd M\tMale\nBeth F\tFemale\nKim M\tFemale').rows).toEqual(expected);
    expect(parsePlayerText('Dianna M,Female\nEd M,Male\nBeth F,Female\nKim M,Female').rows).toEqual(expected);
    // Short codes in their own column count too.
    expect(parsePlayerText('Kim M    F\nEd M\tM').rows).toEqual([
      { name: 'Kim M', gender: 'female' },
      { name: 'Ed M', gender: 'male' },
    ]);
  });

  test('Chip\'s real 29-player list reads exactly, every way it can be pasted', () => {
    const list: [string, string][] = [
      ['Dianna M','Female'],['Ed M','Male'],['Christopher R','Male'],['Tyler R','Male'],['Jason R','Male'],
      ['Stephanie C','Female'],['Beth F','Female'],['Steven F','Male'],['Nicole V','Female'],['Jon S','Male'],
      ['Diana Q','Female'],['Doug M','Male'],['Greg S','Male'],['Greg G','Male'],['Amanda K','Female'],
      ['Brad C','Male'],['Thomas N','Male'],['Bill A','Male'],['Ronald P','Male'],['Scott K','Male'],
      ['Daniel W','Male'],['Chip M','Male'],['Kathleen S','Female'],['John T','Male'],['Diana C','Female'],
      ['Sabina K','Female'],['Aaron R','Male'],['Kana M','Female'],['Kim M','Female'],
    ];
    const want = list.map(([n, g]) => ({ name: n, gender: g.toLowerCase() }));
    for (const sep of ['    ', '\t', ',', ', ']) {
      const r = parsePlayerText(list.map(([n, g]) => n + sep + g).join('\n'));
      expect(r.rows).toEqual(want);
      expect(r.duplicates).toEqual([]);
    }
    // Windows line endings and a trailing blank line change nothing.
    expect(parsePlayerText(list.map(([n, g]) => n + '\t' + g).join('\r\n') + '\r\n').rows).toEqual(want);
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

  test('first, last and gender as three columns keeps McAllister and MacDavid', () => {
    const list: [string, string, string][] = [
      ['Dianna','MacDavid','Female'],['Ed','Mecheal','Male'],['Christopher','Robin','Male'],['Tyler','Raynard','Male'],
      ['Jason','Risley','Male'],['Stephanie','Chapin','Female'],['Beth','Faskowitz','Female'],['Steven','Faskowitz','Male'],
      ['Nicole','Volkoff','Female'],['Jon','Shimazaki','Male'],['Diana','Quiroz','Female'],['Doug','Mathews','Male'],
      ['Greg','Schnieders','Male'],['Greg','Glick','Male'],['Amanda','Killilea','Female'],['Brad','Coleman','Male'],
      ['Thomas','Nguyen','Male'],['Bill','Arseneau','Male'],['Ronald','Pascual','Male'],['Scott','Kurtz','Male'],
      ['Daniel','Wu','Male'],['Chip','McAllister','Male'],['Kathleen','Shafer','Female'],['John','Tu','Male'],
      ['Diana','Chu','Female'],['Sabina','Kelly','Female'],['Aaron','Rosen','Male'],['Kana','Makino','Female'],
      ['Kim','McAllister','Female'],
    ];
    const want = list.map(([f, l, g]) => ({ name: f + ' ' + l, gender: g.toLowerCase() }));
    for (const sep of ['    ', '\t', ',']) {
      const r = parsePlayerText(list.map(r => r.join(sep)).join('\n'));
      expect(r.rows).toEqual(want);
      expect(r.duplicates).toEqual([]);
    }
    // With a header row, and with the gender column first.
    expect(parsePlayerText('First\tLast\tGender\n' + list.map(r => r.join('\t')).join('\n')).rows).toEqual(want);
    expect(parsePlayerText(list.map(([f, l, g]) => [g, f, l].join('\t')).join('\n')).rows).toEqual(want);
  });

  test('first names that look like words are kept (Guy, Lady, Man Ray)', () => {
    expect(parsePlayerText('Guy Smith\nLady Jones, F\nMan Ray').rows).toEqual([
      { name: 'Guy Smith', gender: null },
      { name: 'Lady Jones', gender: 'female' },
      { name: 'Man Ray', gender: null },
    ]);
    expect(parseGrid([['Guy', 'Smith', 'M']]).rows).toEqual([{ name: 'Guy Smith', gender: 'male' }]);
  });

  test('short names: first name plus last initial', () => {
    expect(shortName('Chip McAllister')).toBe('Chip M');
    expect(shortName('Chip M')).toBe('Chip M');
    expect(shortName('Chip M.')).toBe('Chip M');
    expect(shortName('Chip')).toBe('Chip');
    expect(shortName('Mary Ann Smith')).toBe('Mary Ann S');
    expect(shortName('Bob Jones Jr.')).toBe('Bob J');
    expect(shortName("Pat o'brien")).toBe('Pat O');
  });

  test('short names never merge two different people', () => {
    expect(shortNames(['Greg Smith', 'Greg Stone', 'Greg Glick', 'Kim McAllister', 'Kim Mc'])).toEqual(
      ['Greg Sm', 'Greg St', 'Greg G', 'Kim McA', 'Kim Mc']);
    expect(shortNames(['Beth Faskowitz', 'Steven Faskowitz'])).toEqual(['Beth F', 'Steven F']);
    const chip = ['Dianna MacDavid','Ed Mecheal','Christopher Robin','Tyler Raynard','Jason Risley','Stephanie Chapin',
      'Beth Faskowitz','Steven Faskowitz','Nicole Volkoff','Jon Shimazaki','Diana Quiroz','Doug Mathews','Greg Schnieders',
      'Greg Glick','Amanda Killilea','Brad Coleman','Thomas Nguyen','Bill Arseneau','Ronald Pascual','Scott Kurtz',
      'Daniel Wu','Chip McAllister','Kathleen Shafer','John Tu','Diana Chu','Sabina Kelly','Aaron Rosen','Kana Makino',
      'Kim McAllister'];
    expect(shortNames(chip)).toEqual(['Dianna M','Ed M','Christopher R','Tyler R','Jason R','Stephanie C','Beth F',
      'Steven F','Nicole V','Jon S','Diana Q','Doug M','Greg S','Greg G','Amanda K','Brad C','Thomas N','Bill A',
      'Ronald P','Scott K','Daniel W','Chip M','Kathleen S','John T','Diana C','Sabina K','Aaron R','Kana M','Kim M']);
  });

  test('a new person whose short name is taken in the group is lengthened, never dropped', () => {
    expect(shortNames(['Greg Stone', 'Kim Park'], ['Greg S', 'Chip M'])).toEqual(['Greg St', 'Kim P']);
    // Pasted already short and already taken: left as given (the panel skips it as already in the group).
    expect(shortNames(['Greg S'], ['Greg S'])).toEqual(['Greg S']);
    // Taken and nothing left to lengthen: stays, and the review screen says so.
    expect(shortNames(['Kim M'], ['Kim M'])).toEqual(['Kim M']);
  });

  test('tidyName keeps hyphens and apostrophes readable', () => {
    expect(tidyName("mary-kate o'brien")).toBe("Mary-Kate O'Brien");
  });
});
