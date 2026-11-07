// The product name is still undecided, so every page reads it from site.config.json.
// Renaming means editing one file and rebuilding.
import { cpSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const config = JSON.parse(readFileSync('site.config.json', 'utf8'));
const isLive = Boolean(config.STORE_URL);
const values = {
  ...config,
  // Until the extension is published the button must not pretend it can be installed.
  CTA_HREF: isLive ? config.STORE_URL : '#questions',
  CTA_LABEL: isLive ? 'Add to Chrome' : 'Coming soon to Chrome',
};

const TEXT_FILE = /\.(html|js|css|txt|xml)$/;

function fillPlaceholders(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      fillPlaceholders(path);
    } else if (TEXT_FILE.test(entry)) {
      const text = readFileSync(path, 'utf8');
      writeFileSync(path, text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? ''));
    }
  }
}

rmSync('dist', { recursive: true, force: true });
cpSync('src', 'dist', { recursive: true });
fillPlaceholders('dist');
console.log(`Built dist/ as ${config.NAME}`);
