// Plan morning-digest § 3/§ 4: save one rig page as a single self-contained HTML file.
// Usage: node --import tsx scripts/save-preview.ts [path] [out]
//   path defaults to /digest/2026-10-28, out to previews/<night>.html (git-ignored, ADR 0003).
// Renders through the same createApp() the server uses, so the file matches what
// `curl http://localhost:8787<path>` returns (ADR 0001). LANE_MARKER comes from the environment;
// leave it unset for the clean-up copy ("no marker set").
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { createApp } from '../src/app.js';

const path = process.argv[2] ?? '/digest/2026-10-28';
const out = process.argv[3] ?? `previews/${basename(path)}.html`;

const res = await createApp().request(path);
if (res.status !== 200) {
  console.error(`${path} answered ${res.status}; nothing saved`);
  process.exit(1);
}
const html = await res.text();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`saved ${path} → ${out} (${html.length} bytes, marker ${process.env.LANE_MARKER?.trim() ? 'set' : 'unset'})`);
