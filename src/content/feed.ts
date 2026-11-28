import entryNumbers from './entry-numbers.json' with { type: 'json' };
import feedCache from './feed-cache.json' with { type: 'json' };

// --- Types ---

export interface Post {
  slug: string;
  title: string;
  brief: string;
  url: string;
  publishedAt: string;
  coverImage: string | null;
  html: string;
  tags: string[];
  readingMinutes: number;
  entryNumber: number;
}

export interface FeedResponse {
  posts: Post[];
  fetchedAt: string;
}

export interface LabFeedData {
  posts: Post[];
  publishedEntries: Post[];
  publishedCount: number;
  totalPlannedEntries: number;
  modules: ModuleState[];
  foundationText: string;
  fetchedAt: string;
  lastSynced: Date | null;
  isStale: boolean;
  // Build-time cached data (docs & detections)
  docs: DocFile[];
  detections: DetectionsData;
}

export interface ModuleState {
  ring: number;
  slug: string;
  name: string;
  attack_id: string;
  status: 'planned' | 'executed' | 'documented';
  entries: number[];
  writeup: string | null;
  evidence_dir: string | null;
  readmeContent: string | null; // Fetched module README content
  githubUrl: string; // Link to module folder on GitHub
  allEntriesPublished: boolean;
  statusText: string;
}

export interface FoundationState {
  entries: number[];
  text: string;
  publishedCount: number;
  totalCount: number;
  allPublished: boolean;
}

// Docs types
export interface DocFile {
  path: string;
  title: string;
  slug: string;
  content?: string;
  html?: string;
  headings?: Array<{ level: number; text: string; slug: string }>;
  error?: string;
  lastFetched?: number;
}

export interface DetectionsData {
  sigma: DetectionRule[];
  wazuh: DetectionRule[];
}

export interface DetectionRule {
  name: string;
  path: string;
  content: string;
  // Parsed fields
  title?: string;
  tags?: string[];
  level?: string;
  status?: string;
  mitre_tags?: string[];
}

// GitHub module from build-time cache (pre-parsed from modules.yml)
interface CachedModule {
  ring: number;
  slug: string;
  name: string;
  attack_id: string;
  status: 'planned' | 'executed';
  writeup: string | null;
  evidence_dir: string | null;
  entries: number[];
  readmeContent: string | null;
}

// --- Constants ---

const SUPABASE_FUNCTION_URL = 'https://tupmnabopwmxamloscjb.supabase.co/functions/v1/hashnode-feed';
const GITHUB_REPO_URL = 'https://github.com/yashgulatii/Chakravyuha';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY = 'chakravyuha-feed-cache';
const STORAGE_TIMESTAMP_KEY = 'chakravyuha-feed-timestamp';

// --- Entry Number Resolution ---

function resolveEntryNumber(slug: string): number {
  if (slug in entryNumbers) {
    return entryNumbers[slug as keyof typeof entryNumbers];
  }
  const slugMatch = /^post-(\d+)-/.exec(slug);
  if (slugMatch) {
    return Number(slugMatch[1]);
  }
  return -1;
}

function enrichPostsWithEntryNumbers(posts: Omit<Post, 'entryNumber'>[]): Post[] {
  return posts.map(post => ({
    ...post,
    entryNumber: resolveEntryNumber(post.slug),
  }));
}

// --- Module State Derivation from GitHub Data ---

function getModuleState(
  ghModule: CachedModule,
  readmeContent: string | null,
  publishedEntries: Post[]
): ModuleState {
  const publishedEntryNumbers = new Set(publishedEntries.map(e => e.entryNumber));
  const entriesForModule = ghModule.entries || [];
  const allPublished = entriesForModule.every(entryNum => publishedEntryNumbers.has(entryNum));

  // "documented" = status executed AND writeup file successfully fetched AND all entries published
  const hasWriteUp = Boolean(ghModule.writeup && readmeContent);
  const status = ghModule.status === 'executed' && hasWriteUp && allPublished
    ? 'documented'
    : ghModule.status;

  let statusText: string;
  if (status === 'planned') {
    statusText = 'Planned';
  } else if (status === 'executed') {
    statusText = hasWriteUp ? 'Executed · write-up pending' : 'Executed · no write-up';
  } else {
    statusText = 'Documented';
  }

  const githubUrl = `${GITHUB_REPO_URL}/tree/main/modules/${ghModule.slug}/`;

  return {
    ring: ghModule.ring,
    slug: ghModule.slug,
    name: ghModule.name,
    attack_id: ghModule.attack_id,
    status,
    entries: entriesForModule,
    writeup: ghModule.writeup,
    evidence_dir: ghModule.evidence_dir,
    readmeContent,
    githubUrl,
    allEntriesPublished: allPublished,
    statusText,
  };
}

function deriveModuleStates(
  ghModules: CachedModule[],
  readmes: Record<string, string>,
  publishedEntries: Post[]
): ModuleState[] {
  return ghModules.map(m => getModuleState(m, readmes[m.slug] || null, publishedEntries));
}

// --- Foundation State Derivation ---

export function getFoundationText(publishedEntries: Post[]): string {
  const publishedEntryNumbers = new Set(publishedEntries.map(e => e.entryNumber));
  const foundationEntries = [0, 1, 2, 3];
  const publishedCount = foundationEntries.filter(n => publishedEntryNumbers.has(n)).length;
  const allPublished = publishedCount === foundationEntries.length;

  if (allPublished) {
    return `Foundation entries ${foundationEntries[0]}-${foundationEntries[foundationEntries.length - 1]}: published`;
  } else {
    return `Foundation entries ${foundationEntries[0]}-${foundationEntries[foundationEntries.length - 1]}: ${publishedCount} of ${foundationEntries.length} published`;
  }
}

function deriveFoundationState(publishedEntries: Post[]): FoundationState {
  const publishedEntryNumbers = new Set(publishedEntries.map(e => e.entryNumber));
  const foundationEntries = [0, 1, 2, 3];
  const publishedCount = foundationEntries.filter(n => publishedEntryNumbers.has(n)).length;
  const allPublished = publishedCount === foundationEntries.length;

  let text: string;
  if (allPublished) {
    text = `Foundation entries ${foundationEntries[0]}-${foundationEntries[foundationEntries.length - 1]}: published`;
  } else {
    text = `Foundation entries ${foundationEntries[0]}-${foundationEntries[foundationEntries.length - 1]}: ${publishedCount} of ${foundationEntries.length} published`;
  }

  return { entries: foundationEntries, text, publishedCount, totalCount: foundationEntries.length, allPublished };
}

// --- Cache Management (Feed - localStorage) ---

function getCachedData(): { data: FeedResponse; timestamp: number } | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    if (cached && timestamp) {
      return { data: JSON.parse(cached), timestamp: Number(timestamp) };
    }
  } catch {}
  return null;
}

function setCachedData(data: FeedResponse): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  } catch {}
}

function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL_MS;
}

// --- Feed Fetching ---

async function fetchFeed(signal?: AbortSignal): Promise<FeedResponse> {
  const response = await fetch(SUPABASE_FUNCTION_URL, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(detail?.error ?? `Feed fetch failed with status ${response.status}`);
  }

  return response.json() as Promise<FeedResponse>;
}

// --- Main Feed Logic ---

export async function getLabFeedData(forceRefresh = false): Promise<LabFeedData> {
  // 1. Try to get cached feed data (localStorage with 10-min TTL)
  const cached = getCachedData();
  const hasFreshCache = cached && isCacheFresh(cached.timestamp);

  let feedData: FeedResponse;
  let lastSynced: Date | null = null;
  let isStale = false;

  if (hasFreshCache && !forceRefresh) {
    feedData = cached.data;
    lastSynced = new Date(cached.timestamp);
  } else {
    try {
      const freshData = await fetchFeed();
      const enrichedPosts = enrichPostsWithEntryNumbers(freshData.posts);
      feedData = { ...freshData, posts: enrichedPosts };
      setCachedData(feedData);
      lastSynced = new Date(feedData.fetchedAt);
    } catch (error) {
      if (cached) {
        console.warn('[feed] Feed fetch failed, using stale localStorage cache:', error);
        feedData = cached.data;
        lastSynced = new Date(cached.timestamp);
        isStale = true;
      } else {
        console.warn('[feed] Feed fetch failed and no localStorage cache, using build-time cache:', error);
        feedData = feedCache as unknown as FeedResponse;
        lastSynced = new Date(feedData.fetchedAt);
        isStale = true;
      }
    }
  }

  // 2. Use build-time cached modules (pre-parsed from modules.yml at build time)
  // No client-side GitHub fetch - modules come from feed-cache.json
  const cachedModules = (feedCache as any).modules || [];
  const cachedReadmes = (feedCache as any).moduleReadmes || {};

  // 3. Derive module states from build-time cached modules + published entries
  const publishedEntries = feedData.posts.filter(p => p.entryNumber >= 0);
  const moduleStates = deriveModuleStates(cachedModules, cachedReadmes, publishedEntries);
  const foundationState = deriveFoundationState(publishedEntries);

  // 4. Include build-time cached docs and detections
  const docs = (feedCache as any).docs || [];
  const detections = (feedCache as any).detections || { sigma: [], wazuh: [] };

  return {
    posts: feedData.posts,
    publishedEntries,
    publishedCount: publishedEntries.length,
    totalPlannedEntries: 18,
    modules: moduleStates,
    foundationText: foundationState.text,
    fetchedAt: feedData.fetchedAt,
    lastSynced,
    isStale,
    docs,
    detections,
  };
}

// --- React Hook ---

import { useState, useEffect, useCallback } from 'react';

export function useLabFeed() {
  const [data, setData] = useState<LabFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const feedData = await getLabFeedData(true);
      setData(feedData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

// --- Utility Functions ---

export function formatLastSynced(date: Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getExecutedModuleCount(modules: ModuleState[]): number {
  return modules.filter(m => m.status === 'executed' || m.status === 'documented').length;
}

export function getDocumentedModuleCount(modules: ModuleState[]): number {
  return modules.filter(m => m.status === 'documented').length;
}