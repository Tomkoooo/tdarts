import { getTournamentPageDataAction } from "@/features/tournaments/actions/getTournamentPageData.action";
import TournamentPageClient from "./TournamentPageClient";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const initialData = await getTournamentPageDataAction({
    code,
    includeViewer: true,
    view: "overview",
  });

  return <TournamentPageClient initialData={initialData} />;
}
