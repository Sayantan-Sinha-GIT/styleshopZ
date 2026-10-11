import fs from 'node:fs';
import path from 'node:path';

const target = path.join(
  process.cwd(),
  'node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js'
);

if (fs.existsSync(target)) {
  let content = fs.readFileSync(target, 'utf8');
  content = content.replace(
    '**/{*-manifest,required-server-files,prefetch-hints}.json',
    '**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json'
  );
  content = content.replace(
    'p.endsWith("prefetch-hints"))',
    'p.endsWith("prefetch-hints") || p.endsWith("preview-props"))'
  );
  fs.writeFileSync(target, content, 'utf8');
  console.log('Successfully patched @opennextjs/cloudflare for preview-props.');
}
