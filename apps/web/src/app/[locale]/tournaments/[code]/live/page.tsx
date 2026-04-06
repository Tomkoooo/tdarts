import { LiveStreamingPageClient } from "@/components/tournament/LiveStreamingPageClient";

type Props = {
  params: Promise<{ locale: string; code: string }>;
};

export default async function LiveStreamingPage({ params }: Props) {
  const { code } = await params;
  return <LiveStreamingPageClient code={code} />;
}
