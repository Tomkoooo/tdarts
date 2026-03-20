import { redirect } from "next/navigation";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";
import { getServerUser } from "@/lib/getServerUser";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  const user = await getServerUser();

  if (!user?._id) {
    redirect(`/${locale}/auth/login?redirect=${encodeURIComponent(`/${locale}/profile`)}`);
  }

  return <ProfilePageClient />;
}
