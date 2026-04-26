"use client";

import { socket } from "@/lib/socket";

const tournamentRefCounts = new Map<string, number>();
const matchRefCounts = new Map<string, number>();

let connectFlushRegistered = false;

function rejoinAllTrackedRooms() {
  if (!socket.connected) return;
  for (const [code, n] of tournamentRefCounts) {
    if (n > 0) socket.emit("join-tournament", code);
  }
  for (const [id, n] of matchRefCounts) {
    if (n > 0) socket.emit("join-match", id);
  }
}

function ensureConnectFlush() {
  if (connectFlushRegistered) return;
  connectFlushRegistered = true;
  socket.on("connect", rejoinAllTrackedRooms);
}

export function acquireTournamentRoom(code: string | undefined) {
  if (!code) return;
  ensureConnectFlush();
  const next = (tournamentRefCounts.get(code) ?? 0) + 1;
  tournamentRefCounts.set(code, next);
  if (next === 1 && socket.connected) {
    socket.emit("join-tournament", code);
  }
}

export function releaseTournamentRoom(code: string | undefined) {
  if (!code) return;
  const prev = tournamentRefCounts.get(code) ?? 0;
  if (prev <= 1) {
    tournamentRefCounts.delete(code);
    if (socket.connected && prev === 1) {
      socket.emit("leave-tournament", code);
    }
  } else {
    tournamentRefCounts.set(code, prev - 1);
  }
}

export function acquireMatchRoom(matchId: string | undefined) {
  if (!matchId) return;
  ensureConnectFlush();
  const next = (matchRefCounts.get(matchId) ?? 0) + 1;
  matchRefCounts.set(matchId, next);
  if (next === 1 && socket.connected) {
    socket.emit("join-match", matchId);
  }
}

export function releaseMatchRoom(matchId: string | undefined) {
  if (!matchId) return;
  const prev = matchRefCounts.get(matchId) ?? 0;
  if (prev <= 1) {
    matchRefCounts.delete(matchId);
    if (socket.connected && prev === 1) {
      socket.emit("leave-match", matchId);
    }
  } else {
    matchRefCounts.set(matchId, prev - 1);
  }
}
