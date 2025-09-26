"use client";

import axios from "axios";

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;

if (!SOCKET_SERVER_URL) {
  throw new Error('NEXT_PUBLIC_SOCKET_SERVER_URL is not defined');
}

// Function to get API key for socket server requests
const getApiKey = async (): Promise<string> => {
  try {
    const response = await axios.post('/api/socket/auth');
    return response.data.apiKey;
  } catch (error) {
    console.error('Failed to get socket API key:', error);
    throw new Error('Authentication failed');
  }
};

// Make authenticated API call to socket server
export const socketApiCall = async (endpoint: string, data?: any) => {
  try {
    const apiKey = await getApiKey();
    
    const response = await axios.post(`${SOCKET_SERVER_URL}${endpoint}`, data, {
      headers: {
        'x-api-key': apiKey,
        'origin': window.location.origin,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error: any) {
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
