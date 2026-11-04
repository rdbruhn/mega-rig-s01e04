import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page', () => {
  it('renders 2026-10-28 with jobs sorted and a dash for a null owner', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest · 2026-10-28');
    const jobs = [...html.matchAll(/<tr[^>]*><td>([^<]+)<\/td>/g)].map((m) => m[1]);
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs).toEqual([...jobs].sort());
    expect(html).toMatch(/<td>digest\/render<\/td><td>—<\/td>/);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(config).request('/digest/2026-01-09');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no run log for 2026-01-09');
  });
});
