import { importedLastName, fullName } from '../utils/playerNames';

describe('player names', () => {
  test('import keeps the pasted last name behind a short display name', () => {
    expect(importedLastName('Kevin B', 'Kevin Brooks')).toBe('Brooks');
    expect(importedLastName('Greg St', 'Greg Stone')).toBe('Stone');
    expect(importedLastName('Mary Ann S', 'Mary Ann Smith')).toBe('Smith');
    expect(importedLastName('Bob J', 'Bob Jones Jr')).toBe('Jones');
  });
  test('nothing extra when the display name is already the whole name', () => {
    expect(importedLastName('Kevin Brooks', 'Kevin Brooks')).toBe('');
    expect(importedLastName('Kevin', 'Kevin')).toBe('');
    expect(importedLastName('Greg S', 'Greg S')).toBe('');
  });
  test('full name never doubles the initial', () => {
    expect(fullName('Kevin B', 'Brooks')).toBe('Kevin Brooks');
    expect(fullName('Greg St', 'Stone')).toBe('Greg Stone');
    expect(fullName('Kevin', 'Brooks')).toBe('Kevin Brooks');
    expect(fullName('Kevin Brooks', 'Brooks')).toBe('Kevin Brooks');
    expect(fullName('Kevin B', '')).toBe('Kevin B');
    expect(fullName('Kevin B', null)).toBe('Kevin B');
  });
  test('an initial that is not the last name is left alone', () => {
    expect(fullName('Kevin B', 'Smith')).toBe('Kevin B Smith');
  });
});
