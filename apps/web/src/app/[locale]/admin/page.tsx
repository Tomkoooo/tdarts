import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <article className="max-w-none space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="text-muted-foreground">
        The previous admin dashboard UI has been removed from this app. Authorized staff still reach this page to
        confirm access; operational work should use services, APIs, or internal documentation in the repository.
      </p>
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Internal documentation paths</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground font-mono">
          <li>docs/docs-internal/admin-rbac-and-actions.md</li>
          <li>docs/docs-internal/domain-models-atlas.md</li>
        </ul>
      </section>
      <p className="text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="text-primary underline underline-offset-2 hover:no-underline">
          Back to the site home
        </Link>
      </p>
    </article>
  );
}
