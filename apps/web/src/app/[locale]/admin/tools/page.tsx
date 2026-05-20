'use client';

import { AdminPageHeader } from '@/features/admin/components';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { IconPlayerPlay, IconAlertTriangle } from '@tabler/icons-react';

const mockTools = [
  {
    id: 'backfill-locations',
    name: 'Backfill Structured Locations',
    description: 'Migrate legacy location strings to structured location objects',
    script: 'pnpm backfill:locations',
    dangerous: false,
  },
  {
    id: 'backfill-averages',
    name: 'Backfill Match Averages',
    description: 'Calculate and backfill missing match average statistics',
    script: 'pnpm backfill:match-averages',
    dangerous: false,
  },
  {
    id: 'recalc-mmr',
    name: 'Recalculate OAC MMR',
    description: 'Recalculate MMR ratings for all players based on match history',
    script: 'pnpm recalc:oac-mmr',
    dangerous: true,
  },
  {
    id: 'reset-telemetry',
    name: 'Reset Telemetry Data',
    description: 'Clear all telemetry data and reset counters (v3)',
    script: 'pnpm telemetry:reset:v3',
    dangerous: true,
  },
];

export default function AdminToolsPage() {
  const [runningTool, setRunningTool] = useState<string | null>(null);

  const handleRunTool = (toolId: string) => {
    setRunningTool(toolId);
    // Simulate tool execution
    setTimeout(() => setRunningTool(null), 3000);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tools"
        description="Administrative scripts and data management tools"
      />

      <div className="rounded-xl bg-admin-surface-container border border-admin-warning/30 p-4 flex items-start gap-3">
        <IconAlertTriangle className="w-5 h-5 text-admin-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-admin-warning">Caution</p>
          <p className="text-sm text-admin-on-surface-variant mt-0.5">
            These tools directly modify production data. Use with extreme care and ensure you have backups before running any dangerous operations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockTools.map((tool) => (
          <div
            key={tool.id}
            className={`rounded-xl bg-admin-surface-container border p-6 ${
              tool.dangerous ? 'border-admin-error/30' : 'border-admin-outline-variant/20'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-admin-on-surface flex items-center gap-2">
                  {tool.name}
                  {tool.dangerous && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-admin-error/15 text-admin-error">
                      Dangerous
                    </span>
                  )}
                </h3>
                <p className="text-sm text-admin-on-surface-variant mt-1">
                  {tool.description}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-admin-outline-variant/20">
              <code className="text-xs text-admin-on-surface-variant admin-text-mono-data">
                {tool.script}
              </code>
              <Button
                size="sm"
                variant={tool.dangerous ? 'destructive' : 'default'}
                onClick={() => handleRunTool(tool.id)}
                disabled={runningTool === tool.id}
              >
                {runningTool === tool.id ? (
                  <>
                    <span className="animate-spin mr-2">
                      <span className="material-symbols-outlined text-sm">progress_activity</span>
                    </span>
                    Running...
                  </>
                ) : (
                  <>
                    <IconPlayerPlay className="w-4 h-4 mr-2" />
                    Run
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Data Explorer Placeholder */}
      <div className="rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6">
        <h3 className="text-lg font-semibold text-admin-on-surface mb-2">Data Explorer</h3>
        <p className="text-sm text-admin-on-surface-variant mb-4">
          Query and explore database collections directly. Requires ADMIN_DATA_EXPLORER_READ capability.
        </p>
        <div className="flex items-center gap-4">
          <select className="flex-1 px-3 py-2 rounded-lg bg-admin-surface-elevated border border-admin-outline-variant/30 text-admin-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-admin-primary/50">
            <option value="">Select collection...</option>
            <option value="users">Users</option>
            <option value="clubs">Clubs</option>
            <option value="tournaments">Tournaments</option>
            <option value="players">Players</option>
            <option value="matches">Matches</option>
          </select>
          <Button variant="outline" size="sm" className="border-admin-outline-variant/30">
            Browse
          </Button>
        </div>
      </div>
    </div>
  );
}
