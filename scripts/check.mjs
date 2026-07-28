import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const directories = ['src/core', 'extension'];
const files = ['app.js', 'sw.js'];

for (const directory of directories) {
  const entries = await readdir(directory, { withFileTypes: true });
  files.push(
    ...entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
      .map((entry) => join(directory, entry.name))
  );
}

let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status === 0) continue;

  failed = true;
  process.stderr.write(`Syntax check failed: ${file}\n${result.stderr}`);
}

if (failed) process.exit(1);
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
