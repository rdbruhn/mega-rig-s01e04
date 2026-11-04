import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const n = readNight('runs', '2026-10-28')!;

  it('has 5 jobs, sorted, and 1 bad line', () => {
    expect(n.badLines).toBe(1);
    expect(n.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('aggregates runs, retries, last status and error, keeping offsets', () => {
    const fx = n.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(fx).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      fails: 0,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    const backup = n.rows.find((r) => r.job === 'notes/backup')!;
    expect(backup.lastStatus).toBe('fail');
    expect(backup.fails).toBe(1);
    expect(backup.lastError).toBe('quota exceeded');
  });

  it('keeps a row whose owner is null', () => {
    expect(n.rows.find((r) => r.job === 'digest/render')?.owner).toBeNull();
  });

  it('counts events by status', () => {
    expect(n.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });
});

describe('readNight edges', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(join(dir, '2026-01-01.jsonl'), '');
  writeFileSync(join(dir, '2026-01-02.jsonl'), 'not json\n{"at":"x","job":"a","status":"ok"}\n\n');

  it('returns null for a night with no file or a bad name', () => {
    expect(readNight(dir, '2026-01-09')).toBeNull();
    expect(readNight(dir, '../runs/2026-10-28')).toBeNull();
  });

  it('returns no rows for an empty file', () => {
    expect(readNight(dir, '2026-01-01')).toEqual({
      night: '2026-01-01',
      rows: [],
      badLines: 0,
      counts: { ok: 0, retry: 0, fail: 0 },
    });
  });

  it('counts bad lines instead of throwing', () => {
    const n = readNight(dir, '2026-01-02')!;
    expect(n.rows).toEqual([]);
    expect(n.badLines).toBe(2);
  });
});
