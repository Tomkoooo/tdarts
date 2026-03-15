import { redirect } from "next/navigation";
import { StatisticsPageClient } from "@/components/statistics/StatisticsPageClient";
import { getServerUser } from "@/lib/getServerUser";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function StatisticsPage({ params }: Props) {
  const { locale } = await params;
  const user = await getServerUser();

  if (!user?._id) {
    redirect(`/${locale}/auth/login?redirect=${encodeURIComponent(`/${locale}/statistics`)}`);
  }

  return <StatisticsPageClient />;
}
