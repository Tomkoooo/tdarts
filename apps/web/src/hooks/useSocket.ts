"use client";

import { useEffect, useRef, useCallback, useState, useMemo, type MutableRefObject } from "react";
import { socket, initializeSocket } from "@/lib/socket";
import { useSocketFeature } from "./useFeatureFlag";
import {
  acquireMatchRoom,
  acquireTournamentRoom,
  releaseMatchRoom,
  releaseTournamentRoom,
} from "@/lib/socketRoomCoordinator";
import type { FeatureFlagDenialReason } from "@/shared/lib/guards/result";

interface UseSocketOptions {
  tournamentId?: string;
  clubId?: string;
  matchId?: string;
}

export type SocketFeatureUiStatus =
  | "feature_loading"
  | "feature_error"
  | "feature_off"
  | "transport_failed"
  | "connected"
  | "transport_connecting";

type AcquiredRooms = { tournament?: string; match?: string };

function releaseAcquiredRooms(acquired: MutableRefObject<AcquiredRooms>) {
  if (acquired.current.tournament) {
    releaseTournamentRoom(acquired.current.tournament);
    acquired.current.tournament = undefined;
  }
  if (acquired.current.match) {
    releaseMatchRoom(acquired.current.match);
    acquired.current.match = undefined;
  }
}

function syncAcquiredRooms(
  acquired: MutableRefObject<AcquiredRooms>,
  tournamentId: string | undefined,
  matchId: string | undefined,
) {
  if (!socket.connected) return;

  if (acquired.current.tournament !== tournamentId) {
    if (acquired.current.tournament) {
      releaseTournamentRoom(acquired.current.tournament);
      acquired.current.tournament = undefined;
    }
    if (tournamentId) {
      acquireTournamentRoom(tournamentId);
      acquired.current.tournament = tournamentId;
    }
  }

  if (acquired.current.match !== matchId) {
    if (acquired.current.match) {
      releaseMatchRoom(acquired.current.match);
      acquired.current.match = undefined;
    }
    if (matchId) {
      acquireMatchRoom(matchId);
      acquired.current.match = matchId;
    }
  }
}

export const useSocket = ({ tournamentId, clubId, matchId }: UseSocketOptions = {}) => {
  const { isSocketEnabled, isLoading, error, denialReason } = useSocketFeature(clubId);
  const [socketConnected, setSocketConnected] = useState(false);
  const [transportBlocked, setTransportBlocked] = useState(false);
  const shouldNotRetry = useRef(false);
  const acquiredRooms = useRef<AcquiredRooms>({});

  const isDevelopment = process.env.NODE_ENV === "development";
  const shouldEnableSocket = isDevelopment || (isSocketEnabled && !isLoading);

  const isSocketUiDisabled = !isDevelopment && !isSocketEnabled && !isLoading;

  const socketStatus: SocketFeatureUiStatus = useMemo(() => {
    if (isLoading) return "feature_loading";
    if (error) return "feature_error";
    if (isSocketUiDisabled) return "feature_off";
    if (!shouldEnableSocket) return "feature_off";
    if (transportBlocked) return "transport_failed";
    if (socketConnected) return "connected";
    return "transport_connecting";
  }, [isLoading, error, isSocketUiDisabled, shouldEnableSocket, socketConnected, transportBlocked]);

  const emit = useCallback(
    (event: string, data?: any) => {
      if (shouldEnableSocket && socket.connected) {
        console.log(`Emitting ${event}:`, data);
        socket.emit(event, data);
      } else {
        console.log(`Socket not enabled or not connected, skipping emit: ${event}`);
      }
    },
    [shouldEnableSocket],
  );

  useEffect(() => {
    if (!shouldEnableSocket) {
      setSocketConnected(false);
      return;
    }
    const syncConnected = () => {
      setSocketConnected(socket.connected);
    };
    socket.on("connect", syncConnected);
    socket.on("disconnect", syncConnected);
    socket.io.on("reconnect", syncConnected);
    syncConnected();
    return () => {
      socket.off("connect", syncConnected);
      socket.off("disconnect", syncConnected);
      socket.io.off("reconnect", syncConnected);
    };
  }, [shouldEnableSocket]);

  useEffect(() => {
    if (!shouldEnableSocket) {
      releaseAcquiredRooms(acquiredRooms);
      if (socket.connected) {
        console.log("Socket feature disabled, disconnecting...");
        socket.disconnect();
      }
      return;
    }

    if (shouldNotRetry.current) {
      console.log("🔌 Socket connection disabled due to previous auth/CORS errors");
      return;
    }

    const connectWithAuth = async () => {
      if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_SOCKET === "true") {
        console.log("🔌 connectWithAuth called:", {
          shouldEnableSocket,
          socketConnected: socket.connected,
          isSocketEnabled,
          isLoading,
        });
      }

      if (!socket.connected) {
        if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_SOCKET === "true") {
          console.log("Socket feature enabled, initializing authentication...");
        }
        try {
          const authSuccess = await initializeSocket();
          if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_SOCKET === "true") {
            console.log("🔑 Auth result:", authSuccess);
          }
          if (authSuccess) {
            if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_SOCKET === "true") {
              console.log("Authentication successful, connecting to external server...");
            }
            socket.connect();

            const connectionPromise = new Promise<boolean>((resolve) => {
              const timeout = setTimeout(() => {
                if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_SOCKET === "true") {
                  console.error("🔌 Socket connection timeout");
                }
                resolve(false);
              }, 5000);

              socket.once("connect", () => {
                clearTimeout(timeout);
                if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_SOCKET === "true") {
                  console.log("🔌 Socket connected successfully");
                }
                setSocketConnected(true);
                resolve(true);
              });

              socket.once("connect_error", (connectErr: unknown) => {
                clearTimeout(timeout);
                console.error("🔌 Socket connection failed:", connectErr);

                const errorMessage =
                  connectErr && typeof connectErr === "object" && "message" in connectErr
                    ? String((connectErr as { message?: string }).message)
                    : String(connectErr);
                if (
                  errorMessage.includes("CORS") ||
                  errorMessage.includes("401") ||
                  errorMessage.includes("Unauthorized") ||
                  errorMessage.includes("origin")
                ) {
                  console.error("🔌 CORS or Auth error detected, disabling socket reconnection");
                  shouldNotRetry.current = true;
                  setTransportBlocked(true);
                  socket.disconnect();
                }

                resolve(false);
              });
            });

            await connectionPromise;
            setSocketConnected(socket.connected);
          } else {
            console.error("Authentication failed, cannot connect to socket server");
            shouldNotRetry.current = true;
            setTransportBlocked(true);
          }
        } catch (initError: unknown) {
          console.error("🔌 Socket initialization error:", initError);

          const errorMessage = initError instanceof Error ? initError.message : String(initError);
          if (
            errorMessage.includes("not configured") ||
            errorMessage.includes("not authenticated") ||
            errorMessage.includes("CORS") ||
            errorMessage.includes("401") ||
            errorMessage.includes("Unauthorized")
          ) {
            console.warn("Socket authentication/CORS error. Socket features disabled.");
            shouldNotRetry.current = true;
            setTransportBlocked(true);
          }
        }
      } else {
        if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_SOCKET === "true") {
          console.log("🔌 Socket already connected");
        }
        setSocketConnected(true);
      }
    };

    void connectWithAuth();

    const handleConnect = () => {
      if (shouldNotRetry.current) {
        console.log("🔌 Ignoring reconnect due to previous auth/CORS errors");
        socket.disconnect();
        return;
      }

      console.log("🔌 Socket reconnected, syncing rooms...");
      setSocketConnected(true);
      syncAcquiredRooms(acquiredRooms, tournamentId, matchId);
    };

    socket.on("connect", handleConnect);

    if (socket.connected) {
      syncAcquiredRooms(acquiredRooms, tournamentId, matchId);
    }

    return () => {
      socket.off("connect", handleConnect);
      releaseAcquiredRooms(acquiredRooms);
    };
  }, [shouldEnableSocket, tournamentId, matchId]);

  const on = useCallback(
    (event: string, callback: (...args: any[]) => void) => {
      if (shouldEnableSocket && socket.connected) {
        socket.on(event, callback);
      }
    },
    [shouldEnableSocket],
  );

  const off = useCallback(
    (event: string, callback?: (...args: any[]) => void) => {
      if (shouldEnableSocket && socket.connected) {
        if (callback) {
          socket.off(event, callback);
        } else {
          socket.off(event);
        }
      }
    },
    [shouldEnableSocket],
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_SOCKET === "true") {
      console.log("🔌 useSocket state update:", {
        shouldEnableSocket,
        socketConnected: socket.connected,
        isSocketEnabled,
        isLoading,
        error,
        denialReason,
        isConnected: shouldEnableSocket && socket.connected,
        socketStatus,
      });
    }
  }, [shouldEnableSocket, socket.connected, isSocketEnabled, isLoading, error, denialReason, socketStatus]);

  return {
    socket,
    isConnected: shouldEnableSocket && socketConnected,
    isLoading,
    error,
    emit,
    on,
    off,
    socketFeatureLoading: isLoading,
    socketFeatureEnabled: isSocketEnabled,
    socketFeatureDenialReason: denialReason as FeatureFlagDenialReason | null,
    socketStatus,
    isSocketUiDisabled,
    socketTransportBlocked: transportBlocked,
    isSocketTransportConnecting: shouldEnableSocket && !transportBlocked && !socketConnected,
  };
};
