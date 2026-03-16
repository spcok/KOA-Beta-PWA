export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'Major' | 'Minor' | 'Patch';
  changes: string[];
}

export const changelogData: ChangelogEntry[] = [
  {
    version: '1.1.2-beta',
    date: '2026-03-16',
    type: 'Patch',
    changes: [
      'Upgraded Bug Report Viewer with severity parsing and visual badges.',
      'Added ability to resolve and clear bug reports from the administrative dashboard.',
      'Improved bug viewer offline handling with connection status awareness.',
      'Added manual refresh capability to the bug report dashboard.'
    ]
  },
  {
    version: '1.1.1-beta',
    date: '2026-03-16',
    type: 'Patch',
    changes: [
      'Added local database JSON export for manual backups.',
      'Restored PWA Diagnostics view for real-time service worker monitoring.',
      'Added emergency local database purge protocol with double-confirmation.',
      'Improved storage usage visualization in System Health dashboard.'
    ]
  },
  {
    version: '1.1.0-beta',
    date: '2026-03-16',
    type: 'Minor',
    changes: [
      'Added System Health & Diagnostics Dashboard for real-time monitoring.',
      'Enabled real-time Sync Engine monitoring for administrators.',
      'Added local storage usage estimation and quota warnings.',
      'Implemented manual "Force Sync" capability for immediate data flushing.'
    ]
  },
  {
    version: '1.0.0-beta',
    date: '2026-03-16',
    type: 'Major',
    changes: [
      'Initial Beta Release of Kent Owl Academy Management System.',
      'Implementation of Tier-2 Offline Sync Engine with prioritized queueing.',
      'Soft delete system for ZLA 1981 audit trail compliance.',
      'Enterprise PWA architecture with Background Sync and SWR media caching.',
      'Hybrid Data Engine (Supabase + Dexie) for 14-day offline failover.',
      'Role-Based Access Control (RBAC) for staff and administrators.',
      'Automated media upload queue with background processing.',
      'Real-time reconciliation of missed events during offline periods.'
    ]
  }
];
