"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IconArrowLeft, IconDeviceDesktop, IconPlayerPlay } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { Board } from "../types";

interface BoardSelectionScreenProps {
  boards: Board[];
  loading: boolean;
  error: string;
  getBoardLabel: (boardNumber: number, name?: string) => string;
  onBoardSelect: (board: Board) => void;
  onLocalMatchClick: () => void;
  backHref: string;
  backLabel: string;
  tournamentPageHref: string;
  tournamentPageLabel: string;
  title: string;
  subtitle: string;
  selectLabel: string;
  playingLabel: string;
  waitingLabel: string;
  idleLabel: string;
  localMatchLabel: string;
}

export function BoardSelectionScreen({
  boards,
  loading,
  error,
  getBoardLabel,
  onBoardSelect,
  onLocalMatchClick,
  backHref,
  backLabel,
  tournamentPageHref,
  tournamentPageLabel,
  title,
  subtitle,
  selectLabel,
  playingLabel,
  waitingLabel,
  idleLabel,
  localMatchLabel,
}: BoardSelectionScreenProps) {
  const statusConfig: Record<
    string,
    { label: string; variant: "default" | "secondary" | "outline"; ring: string }
  > = {
    playing: {
      label: playingLabel,
      variant: "default",
      ring: "ring-2 ring-primary",
    },
    waiting: {
      label: waitingLabel,
      variant: "secondary",
      ring: "ring-2 ring-amber-500/50",
    },
    idle: {
      label: idleLabel,
      variant: "outline",
      ring: "",
    },
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background/95 to-muted/40 p-4">
      <div className="container mx-auto max-w-6xl py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <IconDeviceDesktop className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {title}
              </h1>
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
            <Button variant="ghost" size="sm" asChild className="w-full sm:w-auto">
              <Link href={backHref}>
                <IconArrowLeft size={18} />
                {backLabel}
              </Link>
            </Button>
            <Button size="sm" asChild className="w-full sm:w-auto">
              <Link href={tournamentPageHref}>{tournamentPageLabel}</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLocalMatchClick}
              className="w-full sm:w-auto gap-2"
            >
              <IconPlayerPlay size={18} />
              {localMatchLabel}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => {
              const config =
                statusConfig[board.status] || statusConfig.idle;
              return (
                <button
                  key={board.boardNumber}
                  onClick={() => onBoardSelect(board)}
                  className={cn(
                    "text-left p-6 rounded-xl transition-all",
                    "bg-card/50 backdrop-blur-xl shadow-xl shadow-black/20 hover:shadow-2xl",
                    config.ring
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">
                        {getBoardLabel(board.boardNumber, board.name)}
                      </h2>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline">
                        {selectLabel}
                      </Button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
