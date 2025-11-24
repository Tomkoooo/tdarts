"use client";

import { io } from "socket.io-client";
import axios from "axios";

// Socket inicializálása a különálló socket serverhez
const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'https://socket.sironic.hu';
const isDevelopment = process.env.NODE_ENV === 'development';

if (!socketServerUrl) {
  throw new Error('NEXT_PUBLIC_SOCKET_SERVER_URL is not defined');
}

let socketToken: string | null = null;
let authFailed = false; // Flag to prevent retry on auth failures

// Function to get authentication token
const getAuthToken = async (): Promise<string> => {
  try {
    const response = await axios.post('/api/socket/auth');
    
    if (response.status === 503) {
      console.warn('Socket authentication not configured. Socket features will be disabled.');
      authFailed = true;
      throw new Error('Socket authentication not configured');
    }
    
    return response.data.token;
  } catch (error: any) {
    if (error.response?.status === 500 || error.response?.status === 401) {
      console.warn('User not authenticated. Socket features will be disabled.');
      authFailed = true;
      throw new Error('User not authenticated');
    }
    console.error('Failed to get socket auth token:', error);
    authFailed = true;
    throw new Error('Authentication failed');
  }
};

// Initialize socket with authentication
export const initializeSocket = async () => {
  // Don't try to initialize if auth has already failed
  if (authFailed) {
    console.log('🔌 Socket initialization skipped due to previous auth failure');
    return false;
  }
  
  try {
    const token = await getAuthToken();
    socketToken = token;
    
    // Configure socket with auth
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
  autoConnect: false, // Manuális kapcsolat minden módban
  transports: ['websocket', 'polling'],
  reconnection: true, // Enable automatic reconnection
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  auth: {
    token: null // Will be set during initialization
  },
  extraHeaders: isDevelopment ? {
    'origin': 'http://localhost:3000'
  } : {}
});

// Export function to check if auth has failed
export const hasSocketAuthFailed = () => authFailed;

// Global debug object for production
if (typeof window !== 'undefined') {
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

// Logoljuk a kapcsolat állapotát
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
  
  // Check for CORS, auth, or origin errors
  const errorMessage = error?.message || error?.toString() || '';
  if (errorMessage.includes('CORS') || 
      errorMessage.includes('401') || 
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('origin') ||
      errorMessage.includes('Authentication')) {
    console.error('🔌 CORS/Auth error detected, disabling socket permanently');
    authFailed = true;
    socket.disconnect();
    return;
  }
  
  // Don't retry if auth has already failed
  if (authFailed) {
    console.log('🔌 Socket disabled due to previous auth failure');
    socket.disconnect();
    return;
  }
});

socket.io.on("reconnect_attempt", (attempt) => {
  console.log(`🔌 Socket reconnection attempt ${attempt}`);
  // Refresh token on reconnection attempt if needed
  // Note: socket.auth is used in handshake, so updating it here might help next attempt
  if (socketToken) {
    socket.auth = { token: socketToken };
  }
});

socket.io.on("reconnect", (attempt) => {
  console.log(`🔌 Socket reconnected after ${attempt} attempts`);
});

socket.io.on("reconnect_failed", () => {
  console.error('🔌 Socket reconnection failed');
}); 