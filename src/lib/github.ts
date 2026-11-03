import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface GithubRepo {
  name: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  url: string;
  homepage: string | null;
  updatedAt: string;
  isFork: boolean;
  archived: boolean;
}

export interface GithubContributor {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
}

export interface GithubSnapshot {
  generatedAt: string;
  org: {
    login: string;
    name: string | null;
    avatarUrl: string;
    description: string | null;
    htmlUrl: string;
    publicRepos: number;
  };
  totals: { stars: number; repos: number };
  repos: GithubRepo[];
  contributors: GithubContributor[];
}

const snapshotPath = fileURLToPath(new URL('../data/github.json', import.meta.url));

/** Build-time snapshot written by `node scripts/sync-github.mjs`; null when absent. */
export function getGithubSnapshot(): GithubSnapshot | null {
  try {
    if (!existsSync(snapshotPath)) return null;
    return JSON.parse(readFileSync(snapshotPath, 'utf8')) as GithubSnapshot;
  } catch {
    return null;
  }
}
