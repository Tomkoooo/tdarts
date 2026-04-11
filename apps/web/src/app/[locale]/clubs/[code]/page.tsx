import { ClubService } from '@tdarts/services';
import { ClubJsonLd } from "@/components/club/ClubJsonLd";
import type { SupportedLocale } from "@/lib/seo";
import ClubDetailClientPage, { type ClubInitialDataLevel } from "./ClubDetailClientPage";

type ClubPageProps = {
  params: Promise<{ locale: string; code: string }>;
  searchParams: Promise<{ page?: string; league?: string; st?: string }>;
};

function toSupportedLocale(locale: string): SupportedLocale {
  return locale === "en" || locale === "de" ? locale : "hu";
}

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
  const [{ locale, code }, search] = await Promise.all([params, searchParams]);
  const uiLocale = toSupportedLocale(locale);
  const defaultPage = resolveDefaultPage(search.page);
  const initialDetailLevel: ClubInitialDataLevel = "summary";
  const requestId = `club-page-${code}-${Date.now().toString(36)}`;

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[perf][club] [${requestId}] page-start code=${code} detail=${initialDetailLevel}`);
    }
    const club = await ClubService.getClubSummary(code, requestId);
    let initialSelectedTournamentIds: string[] = [];
    let invalidShareToken = false;
    const shareToken = typeof search.st === 'string' ? search.st.trim() : '';
    if (shareToken) {
      const resolvedShare = await ClubService.resolveSelectedTournamentsShareToken(shareToken);
      if (resolvedShare && resolvedShare.clubId === String((club as any)._id)) {
        initialSelectedTournamentIds = resolvedShare.tournamentIds;
      } else {
        invalidShareToken = true;
      }
    }

    return (
      <>
        <ClubJsonLd
          locale={uiLocale}
          clubId={code}
          name={club.name}
          description={club.description}
          location={club.location ?? club.address}
        />
        <ClubDetailClientPage
          code={code}
          initialClub={club}
          initialUserRole="none"
          initialPosts={[]}
          initialPostsTotal={0}
          defaultPage={defaultPage}
          initialLeagueId={search.league ?? null}
          initialDetailLevel={initialDetailLevel}
          initialSelectedTournamentIds={initialSelectedTournamentIds}
          invalidShareToken={invalidShareToken}
        />
      </>
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
        initialSelectedTournamentIds={[]}
        invalidShareToken={false}
      />
    );
  }
}
