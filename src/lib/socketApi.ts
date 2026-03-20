"use client";

import axios from "axios";
import { getSocketAuthToken, invalidateSocketAuthToken } from "@/lib/socketAuthToken";

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'https://socket.tdarts.hu';

if (!SOCKET_SERVER_URL) {
  throw new Error('NEXT_PUBLIC_SOCKET_SERVER_URL is not defined');
}

// Make authenticated API call to socket server
export const socketApiCall = async (endpoint: string, data?: any) => {
  try {
    const token = await getSocketAuthToken();
    
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
    if (error.response?.status === 401) {
      invalidateSocketAuthToken();
      const refreshedToken = await getSocketAuthToken({ forceRefresh: true });
      const retryResponse = await axios.post(`${SOCKET_SERVER_URL}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${refreshedToken}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      return retryResponse.data;
    }
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

// Notify that a match has started
export const notifyMatchStarted = async (matchId: string, tournamentCode: string, matchData: any) => {
  return socketApiCall('/api/socket', {
    action: 'notify-match-started',
    matchId,
    tournamentCode,
    matchData
  });
};
