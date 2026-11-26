import { modules, foundation } from './lab';
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
  fetchedAt: string; // ISO string from the feed
  lastSynced: Date | null;
  isStale: boolean;
}

export interface ModuleState {
  n: number;
  id: string;
  name: string;
  attack: string[];
  keyEvent: string;
  tools: string[];
  entries: number[];
  status: 'planned' | 'executed' | 'documented';
  statusNote?: string;
  statusText: string;
  allEntriesPublished: boolean;
  hasWriteUp: boolean;
  writeUpUrl?: string;
}

export interface FoundationState {
  entries: number[];
  text: string;
  publishedCount: number;
  totalCount: number;
  allPublished: boolean;
}

// --- Constants ---

const SUPABASE_FUNCTION_URL = 'https://tupmnabopwmxamloscjb.supabase.co/functions/v1/hashnode-feed';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY = 'chakravyuha-feed-cache';
const STORAGE_TIMESTAMP_KEY = 'chakravyuha-feed-timestamp';

// --- Entry Number Resolution ---

function resolveEntryNumber(slug: string): number {
  // Priority 1: explicit mapping file
  if (slug in entryNumbers) {
    return entryNumbers[slug as keyof typeof entryNumbers];
  }

  // Priority 2: slug regex /^post-(\d+)-/
  const slugMatch = /^post-(\d+)-/.exec(slug);
  if (slugMatch) {
    return Number(slugMatch[1]);
  }

  // Priority 3: unresolvable
  return -1;
}

function enrichPostsWithEntryNumbers(posts: Omit<Post, 'entryNumber'>[]): Post[] {
  return posts.map(post => ({
    ...post,
    entryNumber: resolveEntryNumber(post.slug),
  }));
}

// --- Module State Derivation ---

export function getModuleState(
  module: typeof modules[0],
  publishedEntries: Post[]
): ModuleState {
  const publishedEntryNumbers = new Set(publishedEntries.map(e => e.entryNumber));
  const entriesForModule = module.entries || [];
  const allPublished = entriesForModule.every((entryNum: number) =>
    publishedEntryNumbers.has(entryNum)
  );

  const hasWriteUp = Boolean(module.writeUpUrl);

  let status: 'planned' | 'executed' | 'documented';
  if (module.status === 'documented' && hasWriteUp && allPublished) {
    status = 'documented';
  } else if (module.status === 'executed' || module.status === 'documented') {
    status = hasWriteUp && allPublished ? 'documented' : 'executed';
  } else {
    status = 'planned';
  }

  let statusText: string;
  if (status === 'planned') {
    statusText = 'Planned';
  } else if (status === 'executed') {
    statusText = hasWriteUp ? 'Executed · write-up pending' : 'Executed · no write-up';
  } else {
    statusText = 'Documented';
  }

  return {
    n: module.n,
    id: module.name.toLowerCase().replace(/\s+/g, '-'),
    name: module.name,
    attack: module.attack,
    keyEvent: module.keyEvent,
    tools: module.tools,
    entries: entriesForModule,
    status,
    statusNote: module.statusNote,
    statusText,
    allEntriesPublished: allPublished,
    hasWriteUp,
    writeUpUrl: module.writeUpUrl,
  };
}

function deriveModuleStates(_modules: typeof modules, publishedEntries: Post[]): ModuleState[] {
  return modules.map(module => getModuleState(module, publishedEntries));
}

// --- Foundation State Derivation ---

export function getFoundationText(publishedEntries: Post[]): string {
  const publishedEntryNumbers = new Set(publishedEntries.map(e => e.entryNumber));
  const foundationEntries = foundation.entries || [0, 1, 2, 3];
  const publishedCount = foundationEntries.filter((n: number) => publishedEntryNumbers.has(n)).length;
  const allPublished = publishedCount === foundationEntries.length;

  if (allPublished) {
    return `Foundation entries ${foundationEntries[0]}-${foundationEntries[foundationEntries.length - 1]}: published`;
  } else {
    return `Foundation entries ${foundationEntries[0]}-${foundationEntries[foundationEntries.length - 1]}: ${publishedCount} of ${foundationEntries.length} published`;
  }
}

function deriveFoundationState(_foundation: typeof foundation, publishedEntries: Post[]): FoundationState {
  const publishedEntryNumbers = new Set(publishedEntries.map(e => e.entryNumber));
  const foundationEntries = foundation.entries || [0, 1, 2, 3];
  const publishedCount = foundationEntries.filter((n: number) => publishedEntryNumbers.has(n)).length;
  const allPublished = publishedCount === foundationEntries.length;

  let text: string;
  if (allPublished) {
    text = `Foundation entries ${foundationEntries[0]}-${foundationEntries[foundationEntries.length - 1]}: published`;
  } else {
    text = `Foundation entries ${foundationEntries[0]}-${foundationEntries[foundationEntries.length - 1]}: ${publishedCount} of ${foundationEntries.length} published`;
  }

  return {
    entries: foundationEntries,
    text,
    publishedCount,
    totalCount: foundationEntries.length,
    allPublished,
  };
}

// --- Cache Management ---

function getCachedData(): { data: FeedResponse; timestamp: number } | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    if (cached && timestamp) {
      return { data: JSON.parse(cached), timestamp: Number(timestamp) };
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

function setCachedData(data: FeedResponse): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // Ignore localStorage errors (private browsing, quota exceeded, etc.)
  }
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
  // 1. Try to get cached data (localStorage with 10-min TTL)
  const cached = getCachedData();
  const hasFreshCache = cached && isCacheFresh(cached.timestamp);

  let feedData: FeedResponse;
  let lastSynced: Date | null = null;
  let isStale = false;

  if (hasFreshCache && !forceRefresh) {
    // Use fresh localStorage cache
    feedData = cached.data;
    lastSynced = new Date(cached.timestamp);
  } else {
    // 2. Try to fetch fresh data from Supabase
    try {
      const freshData = await fetchFeed();
      const enrichedPosts = enrichPostsWithEntryNumbers(freshData.posts);
      feedData = { ...freshData, posts: enrichedPosts };
      setCachedData(feedData);
      lastSynced = new Date(feedData.fetchedAt);
    } catch (error) {
      // 3. Fetch failed - fall back to localStorage cache (even if stale)
      if (cached) {
        console.warn('[feed] Fetch failed, using stale localStorage cache:', error);
        feedData = cached.data;
        lastSynced = new Date(cached.timestamp);
        isStale = true;
      } else {
        // 4. No localStorage cache - fall back to build-time cache
        console.warn('[feed] Fetch failed and no localStorage cache, using build-time cache:', error);
        feedData = feedCache as unknown as FeedResponse;
        lastSynced = new Date(feedData.fetchedAt);
        isStale = true;
      }
    }
  }

  // 5. Derive state from feed data
  const publishedEntries = feedData.posts.filter(p => p.entryNumber >= 0);
    const moduleStates = deriveModuleStates(modules, publishedEntries);
    const foundationState = deriveFoundationState(foundation, publishedEntries);

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