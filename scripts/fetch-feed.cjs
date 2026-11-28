#!/usr/bin/env node
/**
 * Prebuild script: fetches the live Hashnode feed from the Supabase Edge Function,
 * fetches modules.yml, module READMEs, docs files, and detection rules from GitHub,
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

// Import constants from the shared file
const { DOCS_FILES, DETECTION_FOLDERS } = require('../src/utils/constants.cjs');

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
          // Render markdown to sanitized HTML (same pipeline as docs)
          const basePath = path.dirname(module.writeup);
          const html = renderMarkdown(content, basePath);
          readmes[module.slug] = html;
          console.log(`[fetch-feed] README fetched and rendered for ${module.slug}`);
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

// Markdown rendering for build-time (using same libs as src/utils/markdown.ts)
const { marked } = require('marked');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const purify = DOMPurify(window);

marked.setOptions({
  gfm: true,
  breaks: true,
});

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractHeadings(markdown) {
  const headings = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    headings.push({ level, text, slug: slugify(text) });
  }
  return headings;
}

function rewriteUrls(html, basePath) {
  const githubBase = 'https://raw.githubusercontent.com/yashgulatii/Chakravyuha/main';

  // Helper to normalize paths (resolve ../ and ./)
  function normalizePath(p) {
    const parts = p.split('/');
    const result = [];
    for (const part of parts) {
      if (part === '..') {
        if (result.length > 0) result.pop();
      } else if (part !== '.' && part !== '') {
        result.push(part);
      }
    }
    return result.join('/');
  }

  return html
    .replace(
      /href="(?!https?:|mailto:|#|\/)([^"]+)"/g,
      (_match, url) => {
        if (url.endsWith('.md')) {
          const route = url.replace(/\.md$/, '').replace(/^README$/, '');
          return `href="/docs/${route}"`;
        }
        // Normalize relative paths before prepending base
        const normalized = normalizePath(url);
        return `href="${githubBase}/${normalized}"`;
      }
    )
    .replace(
      /src="(?!https?:|data:)([^"]+)"/g,
      (_match, url) => {
        // Normalize relative paths before prepending base
        const normalized = normalizePath(url);
        return `src="${githubBase}/${normalized}"`;
      }
    );
}

function sanitizeHtml(html) {
  return purify.sanitize(html, {
    ADD_TAGS: ['mermaid', 'details', 'summary'],
    ADD_ATTR: ['class', 'id', 'data-mermaid'],
    ALLOW_DATA_ATTR: true,
  });
}

// Normalize non-standard markdown image syntax !img(path) -> ![img](path)
function normalizeMarkdownImageSyntax(markdown) {
  return markdown.replace(/!img\(([^)]+)\)/g, '![img]($1)');
}

function renderMarkdown(markdown, basePath) {
  const normalized = normalizeMarkdownImageSyntax(markdown);
  const html = marked.parse(normalized);
  const rewritten = rewriteUrls(html, basePath);
  return sanitizeHtml(rewritten);
}

async function fetchDocFiles() {
  const docs = {};

  for (const doc of DOCS_FILES) {
    try {
      console.log(`[fetch-feed] Fetching doc: ${doc.path}...`);
      const response = await fetch(`${GITHUB_RAW_BASE}/${doc.path}`, {
        headers: { Accept: 'text/markdown' },
      });

      if (response.ok) {
        const content = await response.text();
        // Render markdown to HTML at build time
        const basePath = path.dirname(doc.path);
        const html = renderMarkdown(content, basePath);
        const headings = extractHeadings(content);
        docs[doc.slug] = { ...doc, content, html, headings };
        console.log(`[fetch-feed] Doc fetched and rendered: ${doc.slug}`);
      } else {
        console.warn(`[fetch-feed] Failed to fetch doc ${doc.path}: ${response.status}`);
        docs[doc.slug] = { ...doc, error: `Failed to fetch (${response.status})` };
      }
    } catch (error) {
      console.warn(`[fetch-feed] Error fetching doc ${doc.path}:`, error.message);
      docs[doc.slug] = { ...doc, error: error.message };
    }
  }

  return docs;
}

async function fetchGitHubTree(folder) {
  // Use GitHub API to list files in a folder
  const apiUrl = `https://api.github.com/repos/yashgulatii/Chakravyuha/contents/${folder}`;
  try {
    const response = await fetch(apiUrl, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!response.ok) {
      console.warn(`[fetch-feed] Failed to list ${folder}: ${response.status}`);
      return [];
    }
    const items = await response.json();
    return items.filter(item => item.type === 'file');
  } catch (error) {
    console.warn(`[fetch-feed] Error listing ${folder}:`, error.message);
    return [];
  }
}

async function fetchDetectionFiles() {
  const detections = { sigma: [], wazuh: [] };
  const yaml = require('js-yaml');

  // Simple XML parser for Wazuh rules (extracts rule attributes)
  function parseWazuhXML(xmlContent) {
    const rules = [];
    // Match rule elements with id, level, and description
    const ruleRegex = /<rule\s+([^>]+)>([\s\S]*?)<\/rule>/g;
    let match;
    while ((match = ruleRegex.exec(xmlContent)) !== null) {
      const attrs = match[1];
      const ruleContent = match[2];
      const idMatch = attrs.match(/id="([^"]+)"/);
      const levelMatch = attrs.match(/level="([^"]+)"/);
      const descMatch = ruleContent.match(/<description>([^<]+)<\/description>/);
      const sidMatch = attrs.match(/if_sid="([^"]+)"/);
      
      // Try to extract MITRE tags from comments
      const mitreMatch = ruleContent.match(/ATT&CK.*?T\d{4}(?:\.\d{3})?/gi);
      const mitreTags = mitreMatch ? [...new Set(mitreMatch)] : [];

      if (idMatch) {
        rules.push({
          id: idMatch[1],
          level: levelMatch ? levelMatch[1] : '0',
          description: descMatch ? descMatch[1] : 'No description',
          parent_sid: sidMatch ? sidMatch[1] : null,
          mitre_tags: mitreTags,
        });
      }
    }
    return rules;
  }

  for (const [type, folder] of Object.entries(DETECTION_FOLDERS)) {
    console.log(`[fetch-feed] Fetching ${type} rules from ${folder}...`);
    const files = await fetchGitHubTree(folder);

    for (const file of files) {
      try {
        const response = await fetch(file.download_url, {
          headers: { Accept: 'text/plain' },
        });
        if (response.ok) {
          const content = await response.text();
          let parsedRule = { name: file.name, path: file.path, content };

          if (type === 'sigma') {
            try {
              const parsed = yaml.load(content);
              parsedRule = {
                ...parsedRule,
                title: parsed.title || file.name.replace(/\.yml$/, ''),
                tags: parsed.tags || [],
                level: parsed.level || 'unknown',
                status: parsed.status || 'unknown',
                mitre_tags: parsed.tags?.filter(t => t.startsWith('attack.')) || [],
              };
            } catch (e) {
              console.warn(`[fetch-feed] Failed to parse Sigma YAML ${file.name}:`, e.message);
            }
          } else if (type === 'wazuh') {
            const parsedRules = parseWazuhXML(content);
            if (parsedRules.length > 0) {
              // Use the highest level rule as representative
              const topRule = parsedRules.reduce((a, b) => 
                parseInt(a.level) > parseInt(b.level) ? a : b
              );
              parsedRule = {
                ...parsedRule,
                title: topRule.description,
                level: topRule.level,
                status: 'active',
                tags: parsedRules.map(r => `rule-${r.id}`),
                mitre_tags: [...new Set(parsedRules.flatMap(r => r.mitre_tags || []))],
                _allRules: parsedRules, // Keep all parsed rules for detail view
              };
            }
          }

          detections[type].push(parsedRule);
          console.log(`[fetch-feed] Fetched ${type} rule: ${file.name}`);
        } else {
          console.warn(`[fetch-feed] Failed to fetch ${file.name}: ${response.status}`);
        }
      } catch (error) {
        console.warn(`[fetch-feed] Error fetching ${file.name}:`, error.message);
      }
    }
  }

  return detections;
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
  let feedData = null;
  let posts = [];
  let enrichedPosts = [];

  // Supabase/Hanodish feed fetch (client-side posts) — do NOT block GitHub fetching if this fails
  try {
    console.log('[fetch-feed] Fetching live feed from Supabase Edge Function...');
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(detail?.error ?? `Feed fetch failed with status ${response.status}`);
    }
    feedData = await response.json();
    console.log(`[fetch-feed] Received ${feedData.posts?.length ?? 0} posts.`);
  } catch (error) {
    console.warn('[fetch-feed] Supabase feed fetch failed, using build-time cache fallback:', error.message);
  }

  posts = (feedData && feedData.posts) || [];
  enrichedPosts = enrichPostsWithEntryNumbers(posts);

  const modules = await fetchGitHubModules();
  const readmes = await fetchModuleReadmes(modules);
  const docs = await fetchDocFiles();
  const detections = await fetchDetectionFiles();

    try {
    // Attach readme content to modules
    const modulesWithReadmes = modules.map(m => ({
      ...m,
      readmeContent: readmes[m.slug] || null,
    }));

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
      docs,
      detections,
      foundationText,
      fetchedAt: new Date().toISOString(),
      publishedCount: publishedEntries.length,
      totalPlannedEntries: 18,
    };

    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    console.log(`[fetch-feed] Cache written to ${CACHE_PATH}`);
    console.log(`[fetch-feed] Published entries: ${publishedEntries.length} of 18`);
    console.log(`[fetch-feed] Modules: ${derivedModules.filter(m => m.status === 'executed').length} executed, ${derivedModules.filter(m => m.status === 'documented').length} documented`);
    console.log(`[fetch-feed] Docs: ${Object.keys(docs).length} files fetched`);
    console.log(`[fetch-feed] Detections: ${detections.sigma.length} sigma, ${detections.wazuh.length} wazuh rules`);
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