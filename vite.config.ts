import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { lab, modules } from './src/content/lab.js'

const DOCS_FILES = [
  { slug: 'readme', title: 'README' },
  { slug: 'decisions', title: 'Decisions' },
  { slug: 'architecture', title: 'Architecture' },
  { slug: 'lab-build', title: 'Lab Build' },
  { slug: 'log-pipeline', title: 'Log Pipeline' },
  { slug: 'attack-readiness-gate', title: 'Attack Readiness Gate' },
  { slug: 'engage-mapping', title: 'ENGAGE Mapping' },
  { slug: 'deception', title: 'Deception' },
  { slug: 'hardening', title: 'Hardening' },
]

interface StaticPage {
  path: string
  title: string
  description: string
  noIndex?: boolean
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}

function routeMetadataPlugin(): Plugin {
  const pages: StaticPage[] = [
    {
      path: '/',
      title: lab.fullName,
      description: `${lab.fullName} is an isolated defensive research environment.`,
    },
    {
      path: '/ledger',
      title: `Ledger — ${lab.name}`,
      description: `The status of all ${modules.length} ${lab.name} lab modules.`,
    },
    {
      path: '/architecture',
      title: `Architecture — ${lab.name}`,
      description: `The hosts and network layout of the ${lab.name} lab.`,
    },
    {
      path: '/scope',
      title: `Scope and rules — ${lab.name}`,
      description: `Scope and safety rules for the isolated ${lab.name} Active Directory lab.`,
    },
    ...modules.map((module) => ({
      path: `/ring/${module.n}`,
      title: `Module ${module.n}: ${module.name} — ${lab.name}`,
      description: `Module ${module.n}, ${module.name}, in the ${lab.fullName}.`,
    })),
    {
      path: '/docs',
      title: `Documentation — ${lab.name}`,
      description: `Documentation for the ${lab.fullName}.`,
    },
    ...DOCS_FILES.map((doc) => ({
      path: `/docs/${doc.slug}`,
      title: `${doc.title} — Documentation — ${lab.name}`,
      description: `${doc.title} documentation for the ${lab.fullName}.`,
    })),
    {
      path: '/docs/detections',
      title: `Detections — Documentation — ${lab.name}`,
      description: `Sigma and Wazuh detection rules for ${lab.fullName}.`,
    },
  ]

  function renderPage(template: string, page: StaticPage) {
    const canonical = `https://chakravyuha.tech${page.path}`
    const title = escapeHtml(page.title)
    const description = escapeHtml(page.description)
    const metadata = [
      `<meta name="description" content="${description}" data-rh="true" />`,
      page.noIndex ? '<meta name="robots" content="noindex, follow" data-rh="true" />' : '',
      page.noIndex ? '' : `<link rel="canonical" href="${canonical}" data-rh="true" />`,
      '<meta property="og:type" content="website" data-rh="true" />',
      `<meta property="og:title" content="${title}" data-rh="true" />`,
      `<meta property="og:description" content="${description}" data-rh="true" />`,
      `<meta property="og:url" content="${canonical}" data-rh="true" />`,
      `<meta property="og:image" content="https://chakravyuha.tech/og-image.svg" data-rh="true" />`,
      `<title data-rh="true">${title}</title>`,
    ]
      .filter(Boolean)
      .join('\n    ')
    return template.replace(
      /<!-- page-meta:start -->[\s\S]*?<!-- page-meta:end -->/,
      `<!-- page-meta:start -->\n    ${metadata}\n    <!-- page-meta:end -->`,
    )
  }

  return {
    name: 'chakravyuha-route-metadata',
    apply: 'build',
    async closeBundle() {
      const outputDirectory = resolve('dist')
      const template = await readFile(join(outputDirectory, 'index.html'), 'utf8')
      for (const page of pages) {
        const filePath =
          page.path === '/'
            ? join(outputDirectory, 'index.html')
            : join(outputDirectory, page.path.slice(1), 'index.html')
        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, renderPage(template, page), 'utf8')
      }
      await writeFile(
        join(outputDirectory, '404.html'),
        renderPage(template, {
          path: '/404',
          title: `No such ring — ${lab.name}`,
          description: `The requested ${lab.name} module does not exist.`,
          noIndex: true,
        }),
        'utf8',
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), routeMetadataPlugin()],
  build: {
    assetsInlineLimit: 0,
  },
})
