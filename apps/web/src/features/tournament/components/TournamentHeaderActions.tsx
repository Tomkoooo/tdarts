"use client";

import React from "react";
import Link from "next/link";
import {
  IconChevronDown,
  IconDeviceTv,
  IconRefresh,
  IconScreenShare,
  IconTargetArrow,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shouldShowTournamentLiveTvLinks } from "@/lib/local-calendar-date";

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
  const showLiveTvLinks = shouldShowTournamentLiveTvLinks(
    tournament?.tournamentSettings?.status,
    tournament?.tournamentSettings?.startDate
  );
  const tournamentCode = typeof code === "string" ? code : code?.[0] ?? "";

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
      <Button
        variant="secondary"
        size="sm"
        onClick={onRefetch}
        className="gap-2"
      >
        <IconRefresh className="h-4 w-4" /> {refreshLabel}
      </Button>
      {tournamentId && (
        <>
          <Button asChild variant="default" size="sm" className="gap-2">
            <Link
              href={`/board/${tournamentId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconTargetArrow className="h-4 w-4" />
              {boardsWriterLabel}
            </Link>
          </Button>
          {showLiveTvLinks ? (
            <Button asChild variant="secondary" size="sm" className="gap-2">
              <Link
                href={`/tournaments/${tournamentId}/live`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconScreenShare className="h-4 w-4" />
                {liveLabel}
              </Link>
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-card/80">
                More
                <IconChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {showLiveTvLinks ? (
              <DropdownMenuItem asChild>
                <Link
                  href={`/tournaments/${tournamentCode}/tv`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  <IconDeviceTv className="mr-2 h-4 w-4" />
                  {tvViewLabel}
                </Link>
              </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link
                  href={`/board/${tournamentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  <IconTargetArrow className="mr-2 h-4 w-4" />
                  {boardsWriterLabel}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}
