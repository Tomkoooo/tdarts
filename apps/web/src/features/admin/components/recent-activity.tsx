import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface ActivityItem {
  id: string;
  action: string;
  target: string;
  targetType: string;
  user: string;
  timestamp: Date;
  icon?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  className?: string;
}

export function RecentActivity({ activities, className }: RecentActivityProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 overflow-hidden',
        className
      )}
    >
      <div className="px-5 py-4 border-b border-admin-outline-variant/20">
        <h3 className="text-sm font-medium text-admin-on-surface">
          Recent Activity
        </h3>
      </div>
      <div className="divide-y divide-admin-outline-variant/20">
        {activities.length === 0 ? (
          <div className="px-5 py-8 text-center text-admin-on-surface-variant text-sm">
            No recent activity
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 px-5 py-3 hover:bg-admin-surface-elevated/50 transition-colors"
            >
              <div className="p-1.5 rounded-md bg-admin-surface-elevated text-admin-primary">
                <span className="material-symbols-outlined text-base">
                  {activity.icon || 'history'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-admin-on-surface">
                  <span className="font-medium">{activity.user}</span>{' '}
                  <span className="text-admin-on-surface-variant">
                    {activity.action}
                  </span>{' '}
                  <span className="font-medium">{activity.target}</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-admin-on-surface-variant/70 admin-text-label-caps">
                    {activity.targetType}
                  </span>
                  <span className="text-xs text-admin-on-surface-variant/50">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
