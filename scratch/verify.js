const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const cssPath = path.join(__dirname, '..', 'public', 'index.css');

console.log('Verifying index.html...');
const html = fs.readFileSync(htmlPath, 'utf8');

// Basic sanity check for unclosed div tags we added
const matchesFrame = html.match(/<div class="avatar-frame">/g) || [];
const matchesClip = html.match(/<div class="avatar-clip-wrapper">/g) || [];
const matchesHeaderFrame = html.match(/<div class="header-avatar-frame">/g) || [];
const matchesHeaderClip = html.match(/<div class="header-avatar-clip-wrapper">/g) || [];

console.log('Leo & Lia Selector Cards:');
console.log('  Number of avatar-frame tags:', matchesFrame.length);
console.log('  Number of avatar-clip-wrapper tags:', matchesClip.length);
console.log('Chat Header Active Partner:');
console.log('  Number of header-avatar-frame tags:', matchesHeaderFrame.length);
console.log('  Number of header-avatar-clip-wrapper tags:', matchesHeaderClip.length);

if (matchesFrame.length !== matchesClip.length) {
  console.error('ERROR: Mismatch between avatar-frame and avatar-clip-wrapper!');
  process.exit(1);
}

if (matchesHeaderFrame.length !== matchesHeaderClip.length) {
  console.error('ERROR: Mismatch between header-avatar-frame and header-avatar-clip-wrapper!');
  process.exit(1);
}

console.log('Verifying index.css...');
const css = fs.readFileSync(cssPath, 'utf8');
if (css.includes('avatar-clip-wrapper') && css.includes('header-avatar-clip-wrapper')) {
  console.log('CSS contains the new classes successfully!');
} else {
  console.error('ERROR: CSS is missing the new wrapper classes!');
  process.exit(1);
}

console.log('SUCCESS: All files verified cleanly!');
