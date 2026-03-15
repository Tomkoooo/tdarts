"use client";

import React from "react";
import Link from "next/link";
import { IconDeviceTv, IconRefresh, IconScreenShare } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";

interface TournamentHeaderActionsProps {
  tournament: any;
  code: string | string[];
  onRefetch: () => void;
  refreshLabel: string;
  boardsWriterLabel: string;
  liveLabel: string;
  tvViewLabel: string;
}

export function TournamentHeaderActions({
  tournament,
  code,
  onRefetch,
  refreshLabel,
  boardsWriterLabel,
  liveLabel,
  tvViewLabel,
}: TournamentHeaderActionsProps) {
  const tournamentId =
    typeof tournament?.tournamentId === "string"
      ? tournament.tournamentId
      : undefined;
  const status = tournament?.tournamentSettings?.status;
  const showLive =
    status === "group-stage" || status === "knockout";
  const tournamentCode = typeof code === "string" ? code : code?.[0] ?? "";

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={onRefetch}
        className="gap-2 bg-card/80 hover:bg-card"
      >
        <IconRefresh className="h-4 w-4" /> {refreshLabel}
      </Button>
      {tournamentId && (
        <>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link
              href={`/board/${tournamentId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {boardsWriterLabel}
            </Link>
          </Button>
          {showLive && (
            <Button asChild variant="outline" size="sm" className="gap-2 bg-card/80 hover:bg-card">
              <Link
                href={`/tournaments/${tournamentId}/live`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconScreenShare className="h-4 w-4" />
                {liveLabel}
              </Link>
            </Button>
          )}
          <Button asChild variant="info" size="sm" className="gap-2">
            <Link
              href={`/tournaments/${tournamentCode}/tv`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconDeviceTv />
              {tvViewLabel}
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
