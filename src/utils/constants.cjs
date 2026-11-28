/** Client-safe constants shared between build-time scripts and client-side code. */

const DOCS_FILES = [
  { path: 'README.md', title: 'Overview', slug: 'overview' },
  { path: 'decisions.md', title: 'Decisions', slug: 'decisions' },
  { path: 'docs/architecture.md', title: 'Architecture', slug: 'architecture' },
  { path: 'docs/lab-build.md', title: 'Lab Build', slug: 'lab-build' },
  { path: 'docs/log-pipeline.md', title: 'Log Pipeline', slug: 'log-pipeline' },
  { path: 'docs/attack-readiness-gate.md', title: 'Attack Readiness Gate', slug: 'attack-readiness-gate' },
  { path: 'docs/engage-mapping.md', title: 'Engage Mapping', slug: 'engage-mapping' },
  { path: 'deception/README.md', title: 'Deception', slug: 'deception' },
  { path: 'hardening/README.md', title: 'Hardening', slug: 'hardening' },
];

const DETECTION_FOLDERS = {
  sigma: 'detections/sigma',
  wazuh: 'detections/wazuh',
};

module.exports = { DOCS_FILES, DETECTION_FOLDERS };
