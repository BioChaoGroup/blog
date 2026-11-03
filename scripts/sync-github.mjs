#!/usr/bin/env node
/**
 * Refresh the GitHub snapshot used by the site — dependency-free ESM.
 *
 *   export GITHUB_TOKEN=$(gh auth token)   # optional, but strongly recommended
 *   node scripts/sync-github.mjs
 *
 * Reads the public profile of the lab organisation plus its public repositories
 * and writes `src/data/github.json`:
 *
 *   {
 *     generatedAt,
 *     org:   { login, name, avatarUrl, description, htmlUrl, publicRepos },
 *     totals:{ stars, repos },
 *     repos: [{ name, description, primaryLanguage, stars, url, homepage,
 *               updatedAt, isFork, archived }],
 *     contributors: [{ login, avatarUrl, htmlUrl, contributions }]
 *   }
 *
 * Notes
 * -----
 * - Only public repositories are ever requested (`type=public`); nothing private
 *   can leak into the snapshot even with a token that can see private repos.
 * - Contributors are aggregated from the `/contributors` endpoint across the
 *   repositories the organisation *owns*. Forks are excluded on purpose: their
 *   contributor list is the upstream project's history (forking element-web
 *   would otherwise rank element-web maintainers above the lab). Flip
 *   `INCLUDE_FORK_CONTRIBUTIONS` to change that.
 * - The output is deterministic: sorting never depends on locale or API order.
 *   `generatedAt` is the only value that changes between two runs, and it can be
 *   pinned with `SOURCE_DATE_EPOCH` for reproducible builds.
 * - The file is written to a temporary sibling and renamed into place, so a
 *   failed or interrupted run can never leave a half-written `github.json`.
 *
 * Exit codes: 0 = snapshot written, 1 = network/API failure (file untouched).
 *
 * Environment
 * -----------
 *   GITHUB_TOKEN / GH_TOKEN   optional token (5000 req/h instead of 60 req/h)
 *   GITHUB_ORG                organisation login      (default: BioChaoGroup)
 *   GITHUB_API_URL            API root for testing   (default: api.github.com)
 *   SOURCE_DATE_EPOCH         pin `generatedAt` (seconds since the epoch)
 */

import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUTPUT = join(ROOT, 'src', 'data', 'github.json');

const ORG = process.env.GITHUB_ORG ?? 'BioChaoGroup';
const API = (process.env.GITHUB_API_URL ?? 'https://api.github.com').replace(/\/+$/, '');
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '';
const CONTRIBUTOR_LIMIT = 12;
const INCLUDE_FORK_CONTRIBUTIONS = false;
const USER_AGENT = 'biochaogroup-site-sync (+https://biochaogroup.github.io/blog/)';

/** Thrown for anything the operator can act on; keeps the stack out of the log. */
class SyncError extends Error {}

let requestsMade = 0;
/** Remaining core quota reported by the most recent response. */
let rateRemaining = 'n/a';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function authHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': USER_AGENT,
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return headers;
}

/** Parse `<https://api.github.com/...?page=2>; rel="next"` into a URL. */
function nextPage(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

/**
 * GET one API resource, with retries for transient failures and rate limits.
 * Returns `{ data, headers }`; `data` is `[]` when the endpoint answers 204.
 */
async function request(url, { allow404 = false } = {}) {
  const maxAttempts = 4;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { headers: authHeaders() });
      requestsMade += 1;
      rateRemaining = response.headers.get('x-ratelimit-remaining') ?? rateRemaining;
    } catch (error) {
      lastError = new SyncError(
        `network error contacting ${url} (${error.code ?? error.message}). ` +
          'Check connectivity and proxy settings.',
      );
      if (attempt < maxAttempts) {
        await sleep(400 * attempt);
        continue;
      }
      throw lastError;
    }

    if (response.ok) {
      if (response.status === 204) return { data: [], headers: response.headers };
      return { data: await response.json(), headers: response.headers };
    }

    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = Number(response.headers.get('x-ratelimit-reset') ?? 0) * 1000;
    const retryAfter = Number(response.headers.get('retry-after') ?? 0) * 1000;

    // Empty repositories answer 204, but a few endpoints use 409/404 for "no
    // data" instead of an error — only treat 404 as fatal unless asked not to.
    if (allow404 && response.status === 404) return { data: [], headers: response.headers };

    // 202: the contributors list is still being computed; retry shortly.
    if (response.status === 202) {
      if (attempt < maxAttempts) {
        await sleep(1000 * attempt);
        continue;
      }
      throw new SyncError(`${url} still computing after ${maxAttempts} attempts (HTTP 202).`);
    }

    if (response.status === 403 || response.status === 429 || response.status === 401) {
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.message ? `: ${body.message}` : '';
      } catch {
        /* body was not JSON */
      }
      if (response.status === 401) {
        throw new SyncError(
          `GitHub rejected the token (HTTP 401)${detail}. ` +
            'Run `export GITHUB_TOKEN=$(gh auth token)` again — the token may be expired or malformed.',
        );
      }
      if (remaining === '0') {
        const when = reset ? new Date(reset).toISOString() : 'later';
        throw new SyncError(
          `GitHub API rate limit exhausted (resets at ${when})${detail}. ` +
            'Export a token to get 5000 requests/hour: `export GITHUB_TOKEN=$(gh auth token)`.',
        );
      }
      if (retryAfter > 0 && retryAfter <= 60_000 && attempt < maxAttempts) {
        await sleep(retryAfter);
        continue;
      }
      throw new SyncError(
        `GitHub API refused the request (HTTP ${response.status})${detail}. ` +
          (TOKEN
            ? 'The token may lack read access, or it was rate limited.'
            : 'Anonymous requests are limited to 60/hour; export GITHUB_TOKEN to raise the limit.'),
      );
    }

    // 5xx and other errors: retry with backoff, then give up.
    lastError = new SyncError(`GitHub API returned HTTP ${response.status} for ${url}.`);
    if (attempt < maxAttempts) {
      await sleep(500 * attempt);
      continue;
    }
    throw lastError;
  }

  throw lastError ?? new SyncError(`could not fetch ${url}`);
}

/** Follow pagination and concatenate every page of a list endpoint. */
async function requestAll(url) {
  const items = [];
  let next = url;
  while (next) {
    const { data, headers } = await request(next);
    if (!Array.isArray(data)) {
      throw new SyncError(`expected a list from ${next}, received ${typeof data}`);
    }
    items.push(...data);
    next = nextPage(headers.get('link'));
  }
  return items;
}

/** Plain ordinal comparison — deterministic across machines and locales. */
function compareText(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function generatedAt() {
  const epoch = Number(process.env.SOURCE_DATE_EPOCH ?? NaN);
  const date = Number.isFinite(epoch) && epoch > 0 ? new Date(epoch * 1000) : new Date();
  return date.toISOString();
}

async function collect() {
  console.log(`sync-github: ${ORG} via ${API} (${TOKEN ? 'authenticated' : 'anonymous, 60 req/h'})`);

  // 1. Organisation profile.
  const { data: org } = await request(`${API}/orgs/${ORG}`, { allow404: true });
  if (!org || !org.login) {
    throw new SyncError(
      `organisation "${ORG}" not found (or not public). ` +
        'Set GITHUB_ORG to the correct login.',
    );
  }

  // 2. Public repositories (the only repositories this script will ever see).
  const repos = await requestAll(`${API}/orgs/${ORG}/repos?type=public&per_page=100&sort=full_name`);
  const publicRepos = repos.filter((repo) => !repo.private && !repo.disabled);

  // 3. Contributors, aggregated across repositories owned by the organisation.
  const candidates = publicRepos.filter((repo) => INCLUDE_FORK_CONTRIBUTIONS || !repo.fork);
  const aggregate = new Map();
  let contributorRequestsFailed = 0;

  for (const repo of candidates) {
    let contributors;
    try {
      contributors = await requestAll(
        `${API}/repos/${ORG}/${repo.name}/contributors?per_page=100&anon=0`,
      );
    } catch (error) {
      // One unreadable repository must not lose the whole snapshot.
      contributorRequestsFailed += 1;
      console.warn(`  ! ${repo.name}: could not read contributors (${error.message})`);
      continue;
    }
    for (const person of contributors) {
      if (!person || !person.login) continue; // anonymous email-only entries
      if (person.type === 'Bot' || person.login.endsWith('[bot]')) continue;
      const previous = aggregate.get(person.login) ?? {
        login: person.login,
        avatarUrl: person.avatar_url,
        htmlUrl: person.html_url,
        contributions: 0,
      };
      previous.contributions += Number(person.contributions) || 0;
      aggregate.set(person.login, previous);
    }
  }

  if (candidates.length > 0 && aggregate.size === 0) {
    console.warn('  ! no contributor data came back; writing an empty contributor list');
  }

  // 4. Shape the snapshot (fixed field order, fixed sort order).
  const repoEntries = publicRepos
    .map((repo) => ({
      name: repo.name,
      description: repo.description ?? null,
      primaryLanguage: repo.language ?? null,
      stars: Number(repo.stargazers_count) || 0,
      url: repo.html_url,
      homepage: repo.homepage ? String(repo.homepage).trim() || null : null,
      updatedAt: repo.updated_at ?? repo.pushed_at ?? null,
      isFork: Boolean(repo.fork),
      archived: Boolean(repo.archived),
    }))
    .sort((a, b) => b.stars - a.stars || compareText(a.name, b.name));

  const contributorEntries = [...aggregate.values()]
    .sort((a, b) => b.contributions - a.contributions || compareText(a.login, b.login))
    .slice(0, CONTRIBUTOR_LIMIT);

  const totals = {
    stars: repoEntries.reduce((sum, repo) => sum + repo.stars, 0),
    repos: repoEntries.length,
  };

  return {
    snapshot: {
      generatedAt: generatedAt(),
      org: {
        login: org.login,
        name: org.name ?? org.login,
        avatarUrl: org.avatar_url ?? null,
        description: org.description ?? null,
        htmlUrl: org.html_url,
        publicRepos: Number(org.public_repos) || repoEntries.length,
      },
      totals,
      repos: repoEntries,
      contributors: contributorEntries,
    },
    meta: {
      forks: repoEntries.filter((repo) => repo.isFork).length,
      archived: repoEntries.filter((repo) => repo.archived).length,
      rateRemaining,
      candidateRepos: candidates.length,
    },
  };
}

/** Write via a temporary sibling + rename so readers never see a partial file. */
function writeSnapshot(snapshot) {
  mkdirSync(dirname(OUTPUT), { recursive: true });
  const json = `${JSON.stringify(snapshot, null, 2)}\n`;
  const temp = `${OUTPUT}.tmp-${process.pid}`;
  try {
    writeFileSync(temp, json, 'utf8');
    JSON.parse(json); // cheap guard against emitting invalid JSON
    renameSync(temp, OUTPUT);
  } catch (error) {
    rmSync(temp, { force: true });
    throw new SyncError(`could not write ${OUTPUT}: ${error.message}`);
  }
}

function summarize(snapshot, meta) {
  const { org, totals, repos, contributors } = snapshot;
  console.log('');
  console.log(`  org            ${org.login}${org.name === org.login ? '' : ` (${org.name})`}`);
  console.log(`  public repos   ${totals.repos} (${meta.forks} forks, ${meta.archived} archived)`);
  console.log(`  total stars    ${totals.stars}`);
  console.log(`  top repos      ${repos
    .slice(0, 5)
    .map((repo) => `${repo.name} (${repo.stars}★)`)
    .join(', ')}`);
  console.log(
    `  contributors   ${contributors.length} people` +
      (INCLUDE_FORK_CONTRIBUTIONS ? ' (incl. forks)' : ' (owned repos only)'),
  );
  if (contributors.length > 0) {
    console.log(`                 ${contributors.map((c) => `${c.login} ${c.contributions}`).join(', ')}`);
  }
  console.log(`  requests       ${requestsMade} (core rate limit remaining: ${meta.rateRemaining})`);
  console.log(`  written        ${OUTPUT}`);
  console.log('');
  console.log('sync-github: done');
}

try {
  const { snapshot, meta } = await collect();
  writeSnapshot(snapshot);
  summarize(snapshot, meta);
} catch (error) {
  const message = error instanceof SyncError ? error.message : (error?.stack ?? String(error));
  console.error('');
  console.error(`sync-github: FAILED — ${message}`);
  console.error('src/data/github.json was left untouched; the previous snapshot is still valid.');
  process.exitCode = 1;
}
