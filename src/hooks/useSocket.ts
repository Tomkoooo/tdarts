"use client";

import { useEffect, useRef, useCallback } from 'react';
import { socket, initializeSocket } from '@/lib/socket';
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
  const joinedRooms = useRef<Set<string>>(new Set());

  // Development módban mindig engedélyezett
  const isDevelopment = process.env.NODE_ENV === 'development';
  const shouldEnableSocket = isDevelopment || (isSocketEnabled && !isLoading);

  // Stabilize the emit function with useCallback
  const emit = useCallback((event: string, data?: any) => {
    if (shouldEnableSocket && socket.connected) {
      console.log(`Emitting ${event}:`, data);
      socket.emit(event, data);
    } else {
      console.log(`Socket not enabled or not connected, skipping emit: ${event}`);
    }
  }, [shouldEnableSocket]);

  useEffect(() => {
    // Ha a socket feature nincs engedélyezett, ne inicializáljuk
    if (!shouldEnableSocket) {
      // Ha a feature flag ki van kapcsolva, de a socket csatlakozva van, szakítsuk meg a kapcsolatot
      if (socket.connected) {
        console.log('Socket feature disabled, disconnecting...');
        socket.disconnect();
        isConnected.current = false;
        hasJoinedRooms.current = false;
        joinedRooms.current.clear();
      }
      return;
    }

    // Socket kapcsolat inicializálása csak akkor, ha a feature flag engedélyezett
    const connectWithAuth = async () => {
      if (!socket.connected) {
        console.log('Socket feature enabled, initializing authentication...');
        try {
          const authSuccess = await initializeSocket();
          if (authSuccess) {
            console.log('Authentication successful, connecting to external server...');
            socket.connect();
            isConnected.current = true;
          } else {
            console.error('Authentication failed, cannot connect to socket server');
          }
        } catch (error: any) {
          if (error.message.includes('not configured') || error.message.includes('not authenticated')) {
            console.warn('Socket authentication not available. Socket features disabled.');
          } else {
            console.error('Socket initialization failed:', error);
          }
        }
      }
    };

    connectWithAuth();

    // Room-okhoz csatlakozás csak egyszer
    if (socket.connected && !hasJoinedRooms.current) {
      console.log('Joining rooms...');
      
      // Tournament room csatlakozás
      if (tournamentId && !joinedRooms.current.has(`tournament-${tournamentId}`)) {
        socket.emit('join-tournament', tournamentId);
        joinedRooms.current.add(`tournament-${tournamentId}`);
      }

      // Match room csatlakozás
      if (matchId && !joinedRooms.current.has(`match-${matchId}`)) {
        socket.emit('join-match', matchId);
        joinedRooms.current.add(`match-${matchId}`);
      }

      hasJoinedRooms.current = true;
    }

    // Cleanup function
    return () => {
      if (socket.connected && hasJoinedRooms.current) {
        console.log('Leaving rooms...');
        
        if (matchId) {
          socket.emit('leave-match', matchId);
          joinedRooms.current.delete(`match-${matchId}`);
        }
        if (tournamentId) {
          socket.emit('leave-tournament', tournamentId);
          joinedRooms.current.delete(`tournament-${tournamentId}`);
        }
        
        hasJoinedRooms.current = false;
      }
    };
  }, [shouldEnableSocket, tournamentId, matchId]); // Removed emit from dependencies

  // Socket event listeners
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (shouldEnableSocket && socket.connected) {
      socket.on(event, callback);
    }
  }, [shouldEnableSocket]);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (shouldEnableSocket && socket.connected) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  }, [shouldEnableSocket]);

  return {
    socket,
    isConnected: shouldEnableSocket && socket.connected,
    isLoading,
    error,
    emit,
    on,
    off
  };
}; 