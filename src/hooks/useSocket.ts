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
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
        console.log('🔌 connectWithAuth called:', {
          shouldEnableSocket,
          socketConnected: socket.connected,
          isSocketEnabled,
          isLoading
        });
      }
      
      if (!socket.connected) {
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
          console.log('Socket feature enabled, initializing authentication...');
        }
        try {
          const authSuccess = await initializeSocket();
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
            console.log('🔑 Auth result:', authSuccess);
          }
          if (authSuccess) {
            if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
              console.log('Authentication successful, connecting to external server...');
            }
            socket.connect();
            
            // Wait for connection with timeout
            const connectionPromise = new Promise((resolve) => {
              const timeout = setTimeout(() => {
                if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
                  console.error('🔌 Socket connection timeout');
                }
                resolve(false);
              }, 5000);
              
              socket.once('connect', () => {
                clearTimeout(timeout);
                if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
                  console.log('🔌 Socket connected successfully');
                }
                isConnected.current = true;
                resolve(true);
              });
              
              socket.once('connect_error', (error) => {
                clearTimeout(timeout);
                if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
                  console.error('🔌 Socket connection failed:', error);
                }
                resolve(false);
              });
            });
            
            await connectionPromise;
          } else {
            if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
              console.error('Authentication failed, cannot connect to socket server');
            }
          }
        } catch (error: any) {
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
            console.error('🔌 Socket initialization error:', error);
          }
          if (error.message.includes('not configured') || error.message.includes('not authenticated')) {
            if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
              console.warn('Socket authentication not available. Socket features disabled.');
            }
          } else {
            if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
              console.error('Socket initialization failed:', error);
            }
          }
        }
      } else {
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
          console.log('🔌 Socket already connected');
        }
        isConnected.current = true;
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

  // Debug socket state - always log in production
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
      console.log('🔌 useSocket state update:', {
        shouldEnableSocket,
        socketConnected: socket.connected,
        isSocketEnabled,
        isLoading,
        error,
        isConnected: shouldEnableSocket && socket.connected
      });
    }
  }, [shouldEnableSocket, socket.connected, isSocketEnabled, isLoading, error]);

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