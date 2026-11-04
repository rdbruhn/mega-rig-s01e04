import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestNight } from '../src/digest/types.js';

let runsDir: string;
let app: ReturnType<typeof createApp>;

const BAD = '2026-10-28';
const EMPTY = '2026-01-01';
const SMALL = '2026-10-30';
const MISSING = '2026-02-02';

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  copyFileSync(join('runs', `${BAD}.jsonl`), join(runsDir, `${BAD}.jsonl`));
  writeFileSync(join(runsDir, `${EMPTY}.jsonl`), '');
  writeFileSync(
    join(runsDir, `${SMALL}.jsonl`),
    [
      '{"at":"2026-10-30T01:00:00+01:00","job":"a/fine","status":"ok","owner":"rook"}',
      '{"at":"2026-10-30T02:00:00+01:00","job":"b/orphan","status":"fail","owner":null,"error":"boom"}',
      '',
    ].join('\n'),
  );
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

/** The <tr ...>...</tr> chunk whose first <td> holds `job`. */
function rowFor(html: string, job: string): string {
  const chunks = html.split('<tr').slice(1);
  const hit = chunks.find((c) => /<td[^>]*>\s*([^<]*)/.exec(c)?.[1]?.trim() === job);
  if (!hit) throw new Error(`no row for ${job}`);
  return '<tr' + hit.split('</tr>')[0];
}

describe('GET /digest/:night', () => {
  it('renders the table for a night with a file', async () => {
    const res = await app.request(`/digest/${SMALL}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a/fine');
    expect(html).toContain('b/orphan');
  });

  it('answers 404 with the night named when there is no file', async () => {
    const res = await app.request(`/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain(`no run log for ${MISSING}`);
  });

  it('says nothing ran for an empty file', async () => {
    const res = await app.request(`/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('reports the bad line and still renders the rest', async () => {
    const res = await app.request(`/digest/${BAD}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toMatch(/1 line/);
    expect(html).toContain('lane/sync');
  });

  it('does not mention bad lines on a clean night', async () => {
    const html = await (await app.request(`/digest/${SMALL}`)).text();
    expect(html).not.toMatch(/did not parse/);
  });

  it('marks retries >= 3 and fails with the warn class', async () => {
    const html = await (await app.request(`/digest/${BAD}`)).text();
    // fixtures/refresh: 3 retries, no fail -> the retries cell is marked, the row is not
    const refresh = rowFor(html, 'fixtures/refresh');
    expect(refresh).toMatch(/<td[^>]*class="warn"/);
    expect(refresh.slice(0, refresh.indexOf('>') + 1)).not.toContain('warn');
    // notes/backup: one fail -> the <tr> itself is marked
    const backup = rowFor(html, 'notes/backup');
    expect(backup.slice(0, backup.indexOf('>') + 1)).toContain('class="warn"');
    // lane/sync: 1 retry, no fail -> nothing marked
    expect(rowFor(html, 'lane/sync')).not.toContain('warn');
  });

  it('renders a null owner as an em dash', async () => {
    const html = await (await app.request(`/digest/${SMALL}`)).text();
    expect(rowFor(html, 'b/orphan')).toContain('—');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the DigestNight object', async () => {
    const res = await app.request(`/api/digest/${SMALL}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestNight;
    expect(body.night).toBe(SMALL);
    expect(body.badLines).toBe(0);
    expect(body.counts).toEqual({ ok: 1, retry: 0, fail: 1 });
    expect(body.rows.map((r) => r.job)).toEqual(['a/fine', 'b/orphan']);
    expect(body.rows[1]).toMatchObject({ owner: null, fails: 1, lastStatus: 'fail', lastError: 'boom' });
  });

  it('answers 404 with an error body when there is no file', async () => {
    const res = await app.request(`/api/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log', night: MISSING });
  });

  it('returns empty rows for an empty file', async () => {
    const res = await app.request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as DigestNight;
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts the bad line', async () => {
    const res = await app.request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    expect(((await res.json()) as DigestNight).badLines).toBe(1);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order for 2026-10-28', async () => {
    const html = await (await app.request(`/digest/${BAD}`)).text();
    const body = (await (await app.request(`/api/digest/${BAD}`)).json()) as DigestNight;
    const jobs = body.rows.map((r) => r.job);
    expect(jobs.length).toBeGreaterThan(1);
    expect(jobs).toEqual([...jobs].sort());
    const positions = jobs.map((j) => html.indexOf(`>${j}<`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
