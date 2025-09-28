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

// Function to get authentication token
const getAuthToken = async (): Promise<string> => {
  try {
    const response = await axios.post('/api/socket/auth');
    
    if (response.status === 503) {
      console.warn('Socket authentication not configured. Socket features will be disabled.');
      throw new Error('Socket authentication not configured');
    }
    
    return response.data.token;
  } catch (error: any) {
    if (error.response?.status === 500 || error.response?.status === 401) {
      console.warn('User not authenticated. Socket features will be disabled.');
      throw new Error('User not authenticated');
    }
    console.error('Failed to get socket auth token:', error);
    throw new Error('Authentication failed');
  }
};

// Initialize socket with authentication
export const initializeSocket = async () => {
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
  auth: {
    token: null // Will be set during initialization
  },
  extraHeaders: isDevelopment ? {
    'origin': 'http://localhost:3000'
  } : {}
});

// Global debug object for production
if (typeof window !== 'undefined') {
  (window as any).socketDebug = {
    socket,
    isConnected: () => socket.connected,
    connect: () => socket.connect(),
    disconnect: () => socket.disconnect(),
    getAuthToken: () => socketToken,
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
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
    console.error('🔌 Socket connection error:', error);
  }
  // If auth fails, try to re-authenticate
  if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
      console.log('🔄 Authentication failed, attempting to re-authenticate...');
    }
    initializeSocket().then((success) => {
      if (success) {
        socket.connect();
      }
    });
  }
}); 