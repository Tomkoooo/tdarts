import { Link } from '@/i18n/routing';

export function AdminForbiddenPanel() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-xl font-semibold">No access</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Your account is signed in, but you do not have permission to open the staff admin panel. Contact a platform
        administrator if you believe this is a mistake.
      </p>
      <Link href="/home" className="text-sm text-primary hover:underline">
        Back to app
      </Link>
    </div>
  );
}
