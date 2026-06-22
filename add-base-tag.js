const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

const baseTag = '<base href="/PlayPBNow/" />';

// Add base tag after title if not already present
if (!content.includes('base href')) {
  content = content.replace(
    /<title>[^<]*<\/title>/,
    (match) => match + '\n    ' + baseTag
  );
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log('✅ Added base tag to index.html');
} else {
  console.log('✅ Base tag already present');
}
