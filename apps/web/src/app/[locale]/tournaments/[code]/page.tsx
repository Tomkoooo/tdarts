import { getTournamentPageDataAction } from "@/features/tournaments/actions/getTournamentPageData.action";
import TournamentPageClient from "./TournamentPageClient";

type TournamentSectionView = "players" | "boards" | "groups" | "bracket";
type TournamentSearchParams = {
  tab?: string | string[];
};

const tabToSection = (tab: string | undefined): TournamentSectionView | null => {
  if (tab === "players" || tab === "boards" || tab === "groups" || tab === "bracket") {
    return tab;
  }
  return null;
};

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<TournamentSearchParams>;
}) {
  const [{ code }, rawSearchParams] = await Promise.all([params, searchParams]);
  const tabParam = rawSearchParams?.tab;
  const requestedTab = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  const requestedSection = tabToSection(requestedTab);

  const overviewPromise = getTournamentPageDataAction({
    code,
    includeViewer: true,
    view: "overview",
    bypassCache: true,
    freshness: "force-fresh",
  });
  const sectionPromise = requestedSection
    ? getTournamentPageDataAction({
        code,
        includeViewer: false,
        view: requestedSection,
        bypassCache: true,
        freshness: "force-fresh",
      })
    : Promise.resolve(null);

  const [initialData, sectionData] = await Promise.all([overviewPromise, sectionPromise]);

  const initialSections = requestedSection && sectionData
    ? { [requestedSection]: sectionData }
    : undefined;

  return <TournamentPageClient initialData={initialData} initialSections={initialSections} />;
}
