// Plan morning-digest § 1. The contract every part of § 2 starts against.
// Implementation: `readNight` in src/digest/read.ts (issue #2), typed as `ReadNight` below.

/** One line of runs/<night>.jsonl, once it has parsed. */
export type RunStatus = 'ok' | 'retry' | 'fail';

export type RunLine = {
  at: string; // ISO 8601 with the log's own offset; never converted to UTC
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/** One row per job for the night. */
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as "—"
  runs: number; // lines for this job, any status
  retries: number; // lines with status "retry"
  fails: number; // lines with status "fail"; any fail marks the row (§ 2a)
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that had one; null renders as "—"
  firstAt: string; // as written in the log
  lastAt: string; // as written in the log
};

/** Event counts over every parsed line of the night (board links, § 2c). */
export type StatusCounts = Record<RunStatus, number>;

export type DigestNight = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job (plain string order); empty when the file is empty
  badLines: number; // lines that did not parse; counted, never thrown
  counts: StatusCounts;
};

/**
 * Reads `<runsDir>/<night>.jsonl`.
 * Returns null when `night` is not YYYY-MM-DD or the file does not exist (routes answer 404).
 * Never throws on a bad line; a blank line is not a bad line.
 */
export type ReadNight = (runsDir: string, night: string) => DigestNight | null;

/** Retries at or above this mark a row (§ 2a). */
export const RETRY_MARK = 3;
