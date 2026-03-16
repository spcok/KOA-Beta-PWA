export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'Major' | 'Minor' | 'Patch';
  changes: string[];
}

export const changelogData: ChangelogEntry[] = [
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
