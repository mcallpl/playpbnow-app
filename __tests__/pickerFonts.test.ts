/**
 * The web date and time boxes are raw <input>s. With fontFamily 'inherit'
 * they rendered in Times, because nothing above them names a font (Chip:
 * no serif fonts, ever). They must name a face whose stack ends in sans-serif.
 */
import fs from 'fs';
import path from 'path';

test('web date/time inputs name a sans font', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'SmartDateTimePicker.tsx'), 'utf8');
  expect(src).not.toMatch(/fontFamily:\s*'inherit'/);
  expect(src).toMatch(/fontFamily:\s*`\$\{FONT_BODY_BOLD\}, \$\{\(Fonts as any\)\.sans/);
  const theme = fs.readFileSync(path.join(__dirname, '..', 'constants', 'theme.ts'), 'utf8');
  expect(theme).toMatch(/web:\s*\{\s*sans:\s*"[^"]*sans-serif"/);
});
