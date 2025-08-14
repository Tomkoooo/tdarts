"use client";

import { io } from "socket.io-client";

// Socket inicializálása a különálló socket serverhez
const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:8080';

export const socket = io(socketServerUrl, {
  autoConnect: false, // Manuális kapcsolat minden módban
  transports: ['websocket', 'polling']
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
}); 