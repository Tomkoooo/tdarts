import { redirect } from "next/navigation";
import AuthenticatedHomeContent from "@/components/home/AuthenticatedHomeContent";
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

  return <AuthenticatedHomeContent />;
}
