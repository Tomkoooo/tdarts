"use client";

import { io } from "socket.io-client";
import axios from "axios";

// Socket inicializálása a különálló socket serverhez
const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL!

if (!socketServerUrl) {
  throw new Error('NEXT_PUBLIC_SOCKET_SERVER_URL is not defined');
}

let socketToken: string | null = null;
let apiKey: string | null = null;

// Function to get authentication token
const getAuthToken = async (): Promise<{ token: string; apiKey: string }> => {
  try {
    const response = await axios.post('/api/socket/auth');
    
    if (response.status === 503) {
      console.warn('Socket authentication not configured. Socket features will be disabled.');
      throw new Error('Socket authentication not configured');
    }
    
    return {
      token: response.data.token,
      apiKey: response.data.apiKey
    };
  } catch (error: any) {
    console.error('Failed to get socket auth token:', error);
    throw new Error('Authentication failed');
  }
};

// Initialize socket with authentication
export const initializeSocket = async () => {
  try {
    const auth = await getAuthToken();
    socketToken = auth.token;
    apiKey = auth.apiKey;
    
    // Configure socket with auth
    socket.auth = {
      token: socketToken
    };
    
    // Set headers for API calls
    socket.io.opts.extraHeaders = {
      'x-api-key': apiKey,
      'origin': window.location.origin
    };
    
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
  }
});

// Logoljuk a kapcsolat állapotát
socket.on('connect', () => {
  console.log('🔌 Socket connected to external server');
});

socket.on('disconnect', () => {
  console.log('🔌 Socket disconnected from external server');
});

socket.on('connect_error', (error) => {
  console.error('🔌 Socket connection error:', error);
  // If auth fails, try to re-authenticate
  if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
    console.log('🔄 Authentication failed, attempting to re-authenticate...');
    initializeSocket().then((success) => {
      if (success) {
        socket.connect();
      }
    });
  }
}); 