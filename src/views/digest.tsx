import { RETRY_MARK, type DigestNight } from '../digest/types.js';

const dash = '—';

export function DigestPage({ digest }: { digest: DigestNight }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p>nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((r) => (
              <tr class={r.fails > 0 ? 'warn' : undefined}>
                <td>{r.job}</td>
                <td>{r.owner ?? dash}</td>
                <td>{r.runs}</td>
                <td class={r.retries >= RETRY_MARK ? 'warn' : undefined}>{r.retries}</td>
                <td>{r.lastStatus}</td>
                <td>{r.lastError ?? dash}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 && <p class="mute">{digest.badLines} line(s) did not parse</p>}
    </>
  );
}

export function NoNight({ night }: { night: string }) {
  return (
    <>
      <h1>digest · {night}</h1>
      <p>no run log for {night}</p>
    </>
  );
}
