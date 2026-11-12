// Minimal .env loader (no dependency). Real environment variables always win.
import fs from 'node:fs';
import path from 'node:path';
try {
  const file = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i.exec(line);
      if (!m || line.trim().startsWith('#')) continue;
      let v = m[2];
      if (/^(".*"|'.*')$/.test(v)) v = v.slice(1, -1);
      if (v !== '' && process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  }
} catch { /* ignore */ }
