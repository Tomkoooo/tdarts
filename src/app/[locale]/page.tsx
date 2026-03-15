import { redirect } from "next/navigation";
import MarketingHomeContent from "@/components/home/MarketingHomeContent";
import { getServerUser } from "@/lib/getServerUser";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const user = await getServerUser();

  if (user?._id) {
    redirect(`/${locale}/home`);
  }

  return <MarketingHomeContent />;
}
