# Chakravyuha

The public documentation site for Chakravyuha, an isolated Active Directory purple team lab by Yash Gulati. It documents each ring from both the attack and detection perspectives and does not connect to or expose lab infrastructure.

## Development

```sh
npm install
npm run dev
```

## Build and preview

```sh
npm run build
npm run preview
```

The production build creates route-specific HTML metadata for the home page, ledger, architecture, scope, each ring, and a not-found page. `public/_headers` contains the Cloudflare Pages security headers.

## Content

`src/content/lab.ts` is the source of truth for ring names and states, modules, site metadata, and the planned-post total. Keep unknown tactics, ATT&CK IDs, telemetry details, and write-up content empty until verified material is available. A module with a `postSlug` is counted as a published ledger entry.
