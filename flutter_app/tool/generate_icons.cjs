const path = require('node:path');
const sharp = require('sharp');

const project = path.resolve(__dirname, '..');
const source = path.join(project, 'assets', 'icon.svg');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

Promise.all(Object.entries(sizes).map(([density, size]) =>
  sharp(source).resize(size, size).png().toFile(path.join(
    project, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`, 'ic_launcher.png',
  )),
)).catch((error) => { console.error(error); process.exitCode = 1; });
