import { ClubService } from "@/database/services/club.service";
import ClubDetailClientPage, { type ClubInitialDataLevel } from "./ClubDetailClientPage";

type ClubPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ page?: string; league?: string }>;
};

function resolveDefaultPage(page?: string): "summary" | "players" | "tournaments" | "leagues" | "settings" {
  switch (page) {
    case "players":
    case "tournaments":
    case "leagues":
    case "settings":
      return page;
    default:
      return "summary";
  }
}

export default async function ClubDetailPage({ params, searchParams }: ClubPageProps) {
  const [{ code }, search] = await Promise.all([params, searchParams]);
  const defaultPage = resolveDefaultPage(search.page);
  const initialDetailLevel: ClubInitialDataLevel = "summary";
  const requestId = `club-page-${code}-${Date.now().toString(36)}`;

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[perf][club] [${requestId}] page-start code=${code} detail=${initialDetailLevel}`);
    }
    const club = await ClubService.getClubSummary(code, requestId);

    return (
      <ClubDetailClientPage
        code={code}
        initialClub={club}
        initialUserRole="none"
        initialPosts={[]}
        initialPostsTotal={0}
        defaultPage={defaultPage}
        initialLeagueId={search.league ?? null}
        initialDetailLevel={initialDetailLevel}
      />
    );
  } catch {
    return (
      <ClubDetailClientPage
        code={code}
        initialClub={null}
        initialUserRole="none"
        initialPosts={[]}
        initialPostsTotal={0}
        defaultPage={defaultPage}
        initialLeagueId={search.league ?? null}
        initialDetailLevel={initialDetailLevel}
      />
    );
  }
}
