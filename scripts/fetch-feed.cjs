#!/usr/bin/env node
/**
 * Prebuild script: fetches the live Hashnode feed from the Supabase Edge Function
 * and writes a snapshot to src/content/feed-cache.json for build-time fallback.
 *
 * This runs during `npm run build` (via "prebuild" script in package.json).
 * If the fetch fails, the script exits non-zero but does not overwrite any existing
 * cache, preserving the last good snapshot.
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_FUNCTION_URL = 'https://tupmnabopwmxamloscjb.supabase.co/functions/v1/hashnode-feed';
const CACHE_PATH = path.join(__dirname, '..', 'src', 'content', 'feed-cache.json');

async function fetchFeed() {
  console.log('[fetch-feed] Fetching live feed from Supabase Edge Function...');
  const response = await fetch(SUPABASE_FUNCTION_URL, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error ?? `Feed fetch failed with status ${response.status}`);
  }

  const data = await response.json();
  console.log(`[fetch-feed] Received ${data.posts?.length ?? 0} posts.`);
  return data;
}

function enrichPostsWithEntryNumbers(posts) {
  // Load entry-numbers.json for canonical mapping
  const entryNumbersPath = path.join(__dirname, '..', 'src', 'content', 'entry-numbers.json');
  let entryNumbers = {};
  try {
    entryNumbers = JSON.parse(fs.readFileSync(entryNumbersPath, 'utf-8'));
  } catch {
    console.warn('[fetch-feed] Could not load entry-numbers.json, falling back to regex only.');
  }

  return posts.map(post => {
    // Priority 1: explicit mapping file
    if (post.slug in entryNumbers) {
      return { ...post, entryNumber: entryNumbers[post.slug] };
    }

    // Priority 2: slug regex /^post-(\d+)-/
    const slugMatch = /^post-(\d+)-/.exec(post.slug);
    if (slugMatch) {
      return { ...post, entryNumber: Number(slugMatch[1]) };
    }

    // Priority 3: fallback - assign -1 to flag unresolvable
    console.warn(`[fetch-feed] Cannot resolve entry number for slug "${post.slug}", assigning -1`);
    return { ...post, entryNumber: -1 };
  });
}

function deriveModuleStates(modules, publishedEntries) {
  const publishedEntryNumbers = new Set(publishedEntries.map(e => e.entryNumber));

  return modules.map(module => {
    const entriesForModule = module.entries || [];
    const allPublished = entriesForModule.every(entryNum =>
      publishedEntryNumbers.has(entryNum)
    );

    // Module states: planned -> executed -> documented
    // "documented" only when write-up exists AND all entries published
    // Since write-ups are tracked separately (RingPage shows "write-up pending"),
    // we check if the module has a write-up URL (meaning documented content exists)
    const hasWriteUp = Boolean(module.writeUpUrl);

    let status;
    if (module.status === 'documented' && hasWriteUp && allPublished) {
      status = 'documented';
    } else if (module.status === 'executed' || module.status === 'documented') {
      // If it was previously executed/documented, keep executed unless fully documented
      status = hasWriteUp && allPublished ? 'documented' : 'executed';
    } else {
      status = 'planned';
    }

    return { ...module, status, allEntriesPublished: allPublished };
  });
}

function deriveFoundationText(foundation, publishedEntries) {
  const publishedEntryNumbers = new Set(publishedEntries.map(e => e.entryNumber));
  const foundationEntries = foundation.entries || [0, 1, 2, 3];
  const publishedCount = foundationEntries.filter(n => publishedEntryNumbers.has(n)).length;

  if (publishedCount === foundationEntries.length) {
    return `Foundation entries ${foundationEntries[0]}-${foundationEntries[foundationEntries.length - 1]}: published`;
  } else {
    return `Foundation entries ${foundationEntries[0]}-${foundationEntries[foundationEntries.length - 1]}: ${publishedCount} of ${foundationEntries.length} published`;
  }
}

async function main() {
  try {
    const feedData = await fetchFeed();
    const enrichedPosts = enrichPostsWithEntryNumbers(feedData.posts || []);
    const publishedEntries = enrichedPosts.filter(p => p.entryNumber >= 0);

    // Load lab.ts to get module definitions and foundation
    const labPath = path.join(__dirname, '..', 'src', 'content', 'lab.ts');
    const labContent = fs.readFileSync(labPath, 'utf-8');

    // Extract modules and foundation from lab.ts (simplified - we import the actual module in feed.ts at runtime)
    // For the build-time cache, we store the raw feed data + metadata
    const cache = {
      posts: enrichedPosts,
      fetchedAt: feedData.fetchedAt || new Date().toISOString(),
      publishedCount: publishedEntries.length,
      totalPlannedEntries: 18,
    };

    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    console.log(`[fetch-feed] Cache written to ${CACHE_PATH}`);
    console.log(`[fetch-feed] Published entries: ${publishedEntries.length} of 18`);
  } catch (error) {
    console.error('[fetch-feed] ERROR:', error.message);

    // Check if cache already exists
    if (fs.existsSync(CACHE_PATH)) {
      console.log('[fetch-feed] Preserving existing cache.');
      process.exit(0); // Exit successfully to not break build
    } else {
      console.error('[fetch-feed] No existing cache to fall back to.');
      process.exit(1);
    }
  }
}

main();