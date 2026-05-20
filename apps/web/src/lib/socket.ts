"use client";

import { io } from "socket.io-client";
import {
  resolveSocketAuthToken,
  invalidateSocketAuthToken,
  type BoardSocketAuthInput,
} from "@/lib/socketAuthToken";

// Socket inicializálása a különálló socket serverhez
const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'https://socket.tdarts.hu';
const isDevelopment = process.env.NODE_ENV === 'development';

if (!socketServerUrl) {
  throw new Error('NEXT_PUBLIC_SOCKET_SERVER_URL is not defined');
}

let socketToken: string | null = null;
let authFailed = false;
let lastBoardAuth: BoardSocketAuthInput | undefined;

// Initialize socket with authentication
export const initializeSocket = async (options?: { boardAuth?: BoardSocketAuthInput }) => {
  if (authFailed) {
    console.log('🔌 Socket initialization skipped due to previous auth failure');
    return false;
  }

  if (options?.boardAuth) {
    lastBoardAuth = options.boardAuth;
  }

  try {
    const token = await resolveSocketAuthToken({
      boardAuth: lastBoardAuth,
    });
    socketToken = token;

    socket.auth = {
      token: socketToken
    };

    console.log('🔑 Socket auth configured:', {
      hasToken: !!socketToken,
      tokenLength: socketToken?.length || 0
    });

    return true;
  } catch (error) {
    console.error('Socket initialization failed:', error);
    return false;
  }
};

export const socket = io(socketServerUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  auth: {
    token: null
  },
  extraHeaders: isDevelopment ? {
    'origin': 'http://localhost:3000'
  } : {}
});

export const hasSocketAuthFailed = () => authFailed;

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).socketDebug = {
    socket,
    isConnected: () => socket.connected,
    connect: () => socket.connect(),
    disconnect: () => socket.disconnect(),
    getAuthToken: () => socketToken,
    hasAuthFailed: () => authFailed,
    serverUrl: socketServerUrl
  };
}

socket.on('connect', () => {
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
    console.log('🔌 Socket connected to external server');
  }
});

socket.on('disconnect', () => {
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
    console.log('🔌 Socket disconnected from external server');
  }
});

socket.on('connect_error', (error) => {
  console.error('🔌 Socket connection error:', error);

  const errorMessage = error?.message || error?.toString() || '';
  if (errorMessage.includes('CORS') ||
      errorMessage.includes('401') ||
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('origin') ||
      errorMessage.includes('Authentication')) {
    invalidateSocketAuthToken();
    void resolveSocketAuthToken({ boardAuth: lastBoardAuth, forceRefresh: true })
      .then((token) => {
        socketToken = token;
        socket.auth = { token };
      })
      .catch(() => {
        console.error('🔌 CORS/Auth error detected, disabling socket permanently');
        authFailed = true;
        socket.disconnect();
      });
    return;
  }

  if (authFailed) {
    console.log('🔌 Socket disabled due to previous auth failure');
    socket.disconnect();
    return;
  }
});

socket.io.on("reconnect_attempt", async (attempt) => {
  console.log(`🔌 Socket reconnection attempt ${attempt}`);
  try {
    const token = await resolveSocketAuthToken({ boardAuth: lastBoardAuth });
    socketToken = token;
    socket.auth = { token: socketToken };
  } catch {
    if (socketToken) {
      socket.auth = { token: socketToken };
    }
  }
});

socket.io.on("reconnect", (attempt) => {
  console.log(`🔌 Socket reconnected after ${attempt} attempts`);
});

socket.io.on("reconnect_failed", () => {
  console.error('🔌 Socket reconnection failed');
});
