const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// Replace absolute paths with relative paths
content = content.replace(/src="\/_expo/g, 'src="./_expo');
content = content.replace(/href="\/_expo/g, 'href="./_expo');
content = content.replace(/src="\/assets/g, 'src="./assets');
content = content.replace(/href="\/assets/g, 'href="./assets');
content = content.replace(/href="\/favicon/g, 'href="./favicon');

fs.writeFileSync(indexPath, content, 'utf8');
console.log('✅ Fixed Expo paths in index.html');
