"use client";

import axios from "axios";

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'https://socket.sironic.hu';

if (!SOCKET_SERVER_URL) {
  throw new Error('NEXT_PUBLIC_SOCKET_SERVER_URL is not defined');
}

// Function to get JWT token for socket server requests
const getAuthToken = async (): Promise<string> => {
  try {
    const response = await axios.post('/api/socket/auth');
    
    if (response.status === 503) {
      console.warn('Socket authentication not configured. Socket API calls disabled.');
      throw new Error('Socket authentication not configured');
    }
    
    return response.data.token;
  } catch (error: any) {
    console.error('Failed to get socket auth token:', error);
    throw new Error('Authentication failed');
  }
};

// Make authenticated API call to socket server
export const socketApiCall = async (endpoint: string, data?: any) => {
  try {
    const token = await getAuthToken();
    
    console.log('🔑 Making socket API call:', {
      endpoint,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      origin: window.location.origin
    });
    
    const response = await axios.post(`${SOCKET_SERVER_URL}${endpoint}`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 503) {
      console.warn('Socket authentication not configured. Socket API calls disabled.');
      throw new Error('Socket authentication not configured');
    }
    if (error.message.includes('Authentication failed') || error.message.includes('not configured')) {
      console.warn('Socket authentication failed. Socket API calls disabled.');
      throw new Error('Socket authentication not configured');
    }
    console.error('Socket API call failed:', error);
    throw new Error(error.response?.data?.error || 'Socket API call failed');
  }
};

// Get match state from socket server
export const getMatchState = async (matchId: string) => {
  return socketApiCall('/api/socket', {
    action: 'get-match-state',
    matchId
  });
};

// Get live matches from socket server
export const getLiveMatches = async () => {
  return socketApiCall('/api/socket', {
    action: 'get-live-matches'
  });
};
