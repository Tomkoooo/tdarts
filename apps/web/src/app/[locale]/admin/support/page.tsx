'use client';

import { AdminPageHeader } from '@/features/admin/components';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AdminSupportPage() {
  const params = useParams();
  const locale = params.locale as string;

  const supportLinks = [
    {
      title: 'Feedback Inbox',
      description: 'View and respond to user feedback and bug reports',
      href: `/${locale}/admin/support/feedback`,
      icon: 'feedback',
      count: 4,
    },
    {
      title: 'Documentation',
      description: 'Internal admin documentation and guides',
      href: '#',
      icon: 'description',
    },
    {
      title: 'Release Notes',
      description: 'View platform release history and changelog',
      href: '#',
      icon: 'new_releases',
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Support"
        description="User support tools and documentation"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {supportLinks.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className="group rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-6 hover:bg-admin-surface-elevated transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-admin-surface-elevated group-hover:bg-admin-surface-container transition-colors">
                <span className="material-symbols-outlined text-2xl text-admin-primary">
                  {link.icon}
                </span>
              </div>
              {link.count && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-admin-primary/15 text-admin-primary">
                  {link.count}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-admin-on-surface mb-1">
              {link.title}
            </h3>
            <p className="text-sm text-admin-on-surface-variant">
              {link.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
