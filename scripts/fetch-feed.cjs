#!/usr/bin/env node
/**
 * Prebuild script: fetches the live Hashnode feed from the Supabase Edge Function,
 * fetches modules.yml and module READMEs from GitHub,
 * and writes a snapshot to src/content/feed-cache.json for build-time fallback.
 *
 * This runs during `npm run build` (via "prebuild" script in package.json).
 * If any fetch fails, the script exits non-zero but does not overwrite any existing
 * cache, preserving the last good snapshot.
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_FUNCTION_URL = 'https://tupmnabopwmxamloscjb.supabase.co/functions/v1/hashnode-feed';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/yashgulatii/Chakravyuha/main';
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

async function fetchGitHubModules() {
  console.log('[fetch-feed] Fetching modules.yml from GitHub...');
  const response = await fetch(`${GITHUB_RAW_BASE}/modules.yml`, {
    headers: { Accept: 'application/yaml' },
  });

  if (!response.ok) {
    throw new Error(`modules.yml fetch failed with status ${response.status}`);
  }

  const yamlText = await response.text();
  console.log('[fetch-feed] modules.yml fetched successfully');

  // Parse YAML
  const yaml = require('js-yaml');
  const modules = yaml.load(yamlText);
  console.log(`[fetch-feed] Parsed ${modules?.length ?? 0} modules from modules.yml`);
  return modules;
}

async function fetchModuleReadmes(modules) {
  const readmes = {};

  for (const module of modules) {
    if (module.writeup && module.status === 'executed') {
      try {
        console.log(`[fetch-feed] Fetching README for ${module.slug}...`);
        const response = await fetch(`${GITHUB_RAW_BASE}/${module.writeup}`, {
          headers: { Accept: 'text/markdown' },
        });

        if (response.ok) {
          const content = await response.text();
          readmes[module.slug] = content;
          console.log(`[fetch-feed] README fetched for ${module.slug}`);
        } else {
          console.warn(`[fetch-feed] Failed to fetch README for ${module.slug}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`[fetch-feed] Error fetching README for ${module.slug}:`, error.message);
      }
    }
  }

  return readmes;
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
    // "documented" = status executed AND writeup file successfully fetched AND all entries published
    const hasWriteUp = Boolean(module.writeup && module.readmeContent);
    const status = module.status === 'executed' && hasWriteUp && allPublished
      ? 'documented'
      : module.status;

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
    // Fetch all data sources
    const feedData = await fetchFeed();
    const modules = await fetchGitHubModules();
    const readmes = await fetchModuleReadmes(modules);

    // Attach readme content to modules
    const modulesWithReadmes = modules.map(m => ({
      ...m,
      readmeContent: readmes[m.slug] || null,
    }));

    const enrichedPosts = enrichPostsWithEntryNumbers(feedData.posts || []);
    const publishedEntries = enrichedPosts.filter(p => p.entryNumber >= 0);

    // Derive module states from modules.yml + published entries
    const derivedModules = deriveModuleStates(modulesWithReadmes, publishedEntries);

    // Foundation from modules.yml (first module or dedicated foundation entry)
    // For now, use ring 1 entries as foundation (entries 0-3 are pre-lab)
    const foundation = {
      entries: [0, 1, 2, 3],
    };
    const foundationText = deriveFoundationText(foundation, publishedEntries);

    // Build cache
    const cache = {
      posts: enrichedPosts,
      modules: derivedModules,
      moduleReadmes: readmes,
      foundationText,
      fetchedAt: new Date().toISOString(),
      publishedCount: publishedEntries.length,
      totalPlannedEntries: 18,
    };

    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    console.log(`[fetch-feed] Cache written to ${CACHE_PATH}`);
    console.log(`[fetch-feed] Published entries: ${publishedEntries.length} of 18`);
    console.log(`[fetch-feed] Modules: ${derivedModules.filter(m => m.status === 'executed').length} executed, ${derivedModules.filter(m => m.status === 'documented').length} documented`);
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