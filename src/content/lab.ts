export type LabStatus = 'planned' | 'executed' | 'documented'

export const lab = {
  name: 'Chakravyuha',
  fullName: 'Chakravyuha: An Active Directory Purple Team Lab',
  devanagari: 'चक्रव्यूह',
  domain: 'CORP.CHAKRAVYUH.LOCAL',
  subnet: '192.168.10.0/24',
  network: 'Host-Only',
  platform: 'VMware',
  labVersion: 'v1.0',
  purpose: 'Active Directory Attack & Detection Research Environment',
  method: ['Attack', 'Detect', 'Respond', 'Harden'],
  detection: 'Detection-as-code: Sigma rules written from scratch and run in Wazuh',
  plannedPosts: 18,
  publishedPosts: 0,
  repoUrl: null,
  blogUrl: 'https://blog.chakravyuha.tech',
  authorUrl: 'https://yashgulati.tech',
  useCases: [
    'Kerberos Authentication',
    'Kerberoasting',
    'Lateral Movement',
    'Detection Engineering',
    'Log Analysis',
  ],
}

export const foundation = {
  entries: [0, 1, 2, 3],
  note: 'Series introduction and groundwork. In preparation.',
}

export const modules: {
  n: number
  name: string
  attack: string[]
  keyEvent: string
  tools: string[]
  entries: number[]
  status: LabStatus
  statusNote?: string
}[] = [
  {
    n: 1,
    name: 'Kerberoasting',
    attack: ['T1558.003'],
    keyEvent: '4769 (RC4)',
    tools: ['GetUserSPNs.py', 'Rubeus', 'hashcat'],
    entries: [4, 5],
    status: 'executed',
    statusNote:
      'Executed in the lab. Attack, detection and hardening are complete and verified. The write-up is being prepared.',
  },
  {
    n: 2,
    name: 'AS-REP Roasting',
    attack: ['T1558.004'],
    keyEvent: '4768',
    tools: ['GetNPUsers.py', 'Rubeus'],
    entries: [6],
    status: 'planned',
  },
  {
    n: 3,
    name: 'Pass-the-Hash',
    attack: ['T1550.002'],
    keyEvent: '4624 (Type 3)',
    tools: ['CrackMapExec', 'psexec'],
    entries: [7],
    status: 'planned',
  },
  {
    n: 4,
    name: 'Pass-the-Ticket / Silver Ticket',
    attack: ['T1550.003'],
    keyEvent: '4769, 4768',
    tools: ['Rubeus', 'mimikatz'],
    entries: [13],
    status: 'planned',
  },
  {
    n: 5,
    name: 'Golden Ticket',
    attack: ['T1558.001'],
    keyEvent: '4769 (abnormal KRBTGT)',
    tools: ['mimikatz', 'impacket'],
    entries: [13, 14],
    status: 'planned',
  },
  {
    n: 6,
    name: 'DCSync',
    attack: ['T1003.006'],
    keyEvent: '4662 (replication)',
    tools: ['secretsdump.py', 'mimikatz'],
    entries: [11, 12],
    status: 'planned',
  },
  {
    n: 7,
    name: 'BloodHound ACL Abuse',
    attack: ['T1078.002'],
    keyEvent: '4728 / 4732 / 5136',
    tools: ['BloodHound', 'SharpHound', 'PowerView'],
    entries: [9, 10],
    status: 'planned',
  },
  {
    n: 8,
    name: 'LAPS Bypass',
    attack: ['T1555'],
    keyEvent: '4662',
    tools: ['CME LAPS module'],
    entries: [15],
    status: 'planned',
  },
  {
    n: 9,
    name: 'AD CS ESC1',
    attack: ['T1649'],
    keyEvent: '4886 / 4887',
    tools: ['Certipy'],
    entries: [16],
    status: 'planned',
  },
]

export interface Host {
  id: string
  ip: string
  os: string
  roles: string[]
  zone: 'domain' | 'attacker'
  tier?: string
  firewall: boolean
  note?: string
  logSources?: string[]
  nics?: string[]
}

export const hosts: Host[] = [
  {
    id: 'DC-01',
    ip: '192.168.10.10',
    os: 'Windows Server 2022',
    roles: ['AD DS', 'DNS', 'KDC'],
    zone: 'domain',
    tier: 'Tier 0',
    firewall: true,
  },
  {
    id: 'SRV-01',
    ip: '192.168.10.20',
    os: 'Windows Server 2019',
    roles: ['File Server', 'IIS'],
    zone: 'domain',
    tier: 'Tier 1',
    firewall: true,
    note: 'Hosts the SQL service account used as the Kerberoasting target.',
  },
  {
    id: 'WS-01',
    ip: '192.168.10.30',
    os: 'Windows 10 Enterprise',
    roles: ['Low-privilege domain user'],
    zone: 'domain',
    tier: 'Tier 2 / Finance',
    firewall: true,
  },
  {
    id: 'WS-02',
    ip: '192.168.10.31',
    os: 'Windows 10 Enterprise',
    roles: ['Domain user'],
    zone: 'domain',
    tier: 'Tier 2 / Engineering',
    firewall: true,
  },
  {
    id: 'SIEM',
    ip: '192.168.10.50',
    os: 'Ubuntu 22.04',
    roles: ['Wazuh (primary)', 'Splunk Free (optional)'],
    logSources: ['Windows Event Logs', 'Sysmon'],
    zone: 'domain',
    firewall: true,
  },
  {
    id: 'KALI',
    ip: '192.168.10.100',
    os: 'Kali Linux',
    roles: ['Attacker machine'],
    nics: ['Host-Only', 'NAT'],
    zone: 'attacker',
    firewall: false,
    note: 'Controlled internet egress, Kali only, through VMware NAT.',
  },
]

export const decoys = [
  { id: 'd1', label: 'Decoy service account (Kerberoasting bait)', attachedTo: 'DC-01' },
  { id: 'd2', label: 'Decoy backup account', attachedTo: 'DC-01' },
  { id: 'd3', label: 'Canary token: SYSVOL spreadsheet', attachedTo: 'DC-01' },
  { id: 'd4', label: 'Canary token: workstation document', attachedTo: 'WS-01' },
]

export const tiers = [
  { tier: 0, scope: 'DC-01 only' },
  { tier: 1, scope: 'SRV-01 only' },
  { tier: 2, scope: 'WS-01 and WS-02 only' },
]

export const tierRule = 'No credential ever crosses a tier boundary.'

export const gate = [
  'Hosts built and domain-joined, with tiered OUs and the AD tiering model applied',
  'Realistic user population added, with varied placement',
  'GPO baseline configured: password and lockout policy, workstation restrictions',
  'Logging confirmed working, not just installed: Wazuh deployed, Sysmon on all four Windows hosts, a test event per host seen in the SIEM, baseline log volume observed',
  'Deception layer placed, and each object triggered once with the alert confirmed',
  'Clean baseline snapshot taken of all six VMs',
]

export const gateRule = 'No attack module runs until every item passes.'

export const decisions = [
  {
    title: 'Detection-first balance audit',
    body: 'The write-up plan had drifted offense-heavy. BloodHound, DCSync and Golden Ticket each now get a dedicated detection entry, and a LAPS bypass entry was added.',
  },
  {
    title: 'Attack Readiness Gate',
    body: 'A silent SIEM proves nothing unless the log pipeline is confirmed working first, so the gate comes before any attack.',
  },
  {
    title: 'Deception response stays passive',
    body: 'Decoys capture IP and timestamp for attribution. Nothing is ever done against the triggering system.',
  },
  {
    title: 'Defender XDR integration dropped',
    body: 'It was explored, then dropped: it added friction to a build already in flight. Revisit after all nine modules and the blog are done.',
  },
  {
    title: 'Tiering enforced, not just drawn',
    body: 'Admin credentials are scoped per tier and per host, in practice and not only on a diagram.',
  },
]
