import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Configure marked for our needs
marked.setOptions({
  gfm: true,
  breaks: true,
})

// Configure DOMPurify with JSDOM for server-side (build-time) usage
const window = new JSDOM('').window
const purify = DOMPurify(window)

/** Rewrite relative links/images to point to GitHub raw URLs */
function rewriteUrls(html: string, basePath: string): string {
  const githubBase = 'https://raw.githubusercontent.com/yashgulatii/Chakravyuha/main'

  // Rewrite relative links: [text](relative/path.md) -> [text](https://raw.githubusercontent.com/...)
  // But keep absolute URLs and site routes intact
  return html
    .replace(
      /href="(?!https?:|mailto:|#|\/)([^"]+)"/g,
        (_match, url) => {
        // Handle .md links - convert to site routes
        if (url.endsWith('.md')) {
          const route = url.replace(/\.md$/, '').replace(/^README$/, '')
          return `href="/docs/${route}"`
        }
        // Handle relative paths in docs folder
        if (url.startsWith('../') || url.startsWith('./')) {
          return `href="${githubBase}/${basePath}/${url}"`
        }
        // Other relative links
        return `href="${githubBase}/${basePath}/${url}"`
      }
    )
    .replace(
      /src="(?!https?:|data:)([^"]+)"/g,
        (_match, url) => {
        // Rewrite relative image paths to GitHub raw
        if (url.startsWith('../') || url.startsWith('./')) {
          return `src="${githubBase}/${basePath}/${url}"`
        }
        return `src="${githubBase}/${basePath}/${url}"`
      }
    )
}

/** Sanitize HTML - allow only safe tags, preserve tables, code blocks, Mermaid */
export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ADD_TAGS: ['mermaid', 'details', 'summary'],
    ADD_ATTR: ['class', 'id', 'data-mermaid'],
    ALLOW_DATA_ATTR: true,
  })
}

/** Render markdown to sanitized HTML with URL rewriting */
export function renderMarkdown(markdown: string, basePath: string): string {
  const html = marked.parse(markdown) as string
  const rewritten = rewriteUrls(html, basePath)
  return sanitizeHtml(rewritten)
}

/** Generate a slug from a heading for anchor links */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Extract headings from markdown for table of contents */
export function extractHeadings(markdown: string): Array<{ level: number; text: string; slug: string }> {
  const headings: Array<{ level: number; text: string; slug: string }> = []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  let match
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    headings.push({ level, text, slug: slugify(text) })
  }
  return headings
}