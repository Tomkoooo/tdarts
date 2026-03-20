import { redirect } from "next/navigation";
import { Suspense } from "react";
import HomeServerShell from "@/components/home/HomeServerShell";
import { getServerUser } from "@/lib/getServerUser";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AuthenticatedHomePage({ params }: Props) {
  const { locale } = await params;
  const user = await getServerUser();

  if (!user?._id) {
    redirect(`/${locale}/auth/login?redirect=${encodeURIComponent(`/${locale}/home`)}`);
  }

  return (
    <Suspense fallback={<div className="min-h-screen p-4 md:p-8" />}>
      <HomeServerShell
        locale={locale}
        serverUserName={user.name}
        serverUsername={user.username}
        serverProfilePicture={user.profilePicture}
      />
    </Suspense>
  );
}
