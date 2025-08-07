"use client";

import { useEffect, useRef } from 'react';
import { socket } from '@/lib/socket';
import { useSocketFeature } from './useFeatureFlag';

interface UseSocketOptions {
  tournamentId?: string;
  clubId?: string;
  matchId?: string;
}

export const useSocket = ({ tournamentId, clubId, matchId }: UseSocketOptions = {}) => {
  const { isSocketEnabled, isLoading, error } = useSocketFeature(clubId);
  const isConnected = useRef(false);
  const hasJoinedRooms = useRef(false);

  useEffect(() => {
    // Ha a socket feature nincs engedélyezett, ne inicializáljuk
    if (!isSocketEnabled || isLoading) {
      // Ha a feature flag ki van kapcsolva, de a socket csatlakozva van, szakítsuk meg a kapcsolatot
      if (socket.connected) {
        console.log('Socket feature disabled, disconnecting...');
        socket.disconnect();
        isConnected.current = false;
        hasJoinedRooms.current = false;
      }
      return;
    }

    // Socket kapcsolat inicializálása csak akkor, ha a feature flag engedélyezett
    if (!socket.connected) {
      console.log('Socket feature enabled, connecting...');
      socket.connect();
      isConnected.current = true;
    }

    // Room-okhoz csatlakozás csak egyszer
    if (socket.connected && !hasJoinedRooms.current) {
      console.log('Joining rooms...');
      
      // Tournament room csatlakozás
      if (tournamentId) {
        socket.emit('join-tournament', tournamentId);
      }

      // Match room csatlakozás
      if (matchId) {
        socket.emit('join-match', matchId);
      }

      hasJoinedRooms.current = true;
    }

    // Cleanup function
    return () => {
      if (socket.connected && hasJoinedRooms.current) {
        console.log('Leaving rooms...');
        
        if (matchId) {
          socket.emit('leave-match', matchId);
        }
        if (tournamentId) {
          socket.emit('leave-tournament', tournamentId);
        }
        
        hasJoinedRooms.current = false;
      }
    };
  }, [isSocketEnabled, isLoading, tournamentId, matchId]);

  // Socket event listeners
  const on = (event: string, callback: (...args: any[]) => void) => {
    if (isSocketEnabled && !isLoading && socket.connected) {
      socket.on(event, callback);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (isSocketEnabled && !isLoading && socket.connected) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  };

  const emit = (event: string, data?: any) => {
    if (isSocketEnabled && !isLoading && socket.connected) {
      console.log(`Emitting ${event}:`, data);
      socket.emit(event, data);
    } else {
      console.log(`Socket not enabled or not connected, skipping emit: ${event}`);
    }
  };

  return {
    socket,
    isConnected: isSocketEnabled && !isLoading && socket.connected,
    isLoading,
    error,
    on,
    off,
    emit
  };
}; 