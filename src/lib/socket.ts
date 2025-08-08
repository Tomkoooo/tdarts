"use client";

import { io } from "socket.io-client";

// Socket inicializálása
// Development módban automatikus kapcsolat, production-ban manuális
const isDevelopment = process.env.NODE_ENV === 'development';

export const socket = io({
  autoConnect: isDevelopment,
  transports: ['websocket', 'polling']
});

// Development módban logoljuk a kapcsolat állapotát
if (isDevelopment) {
  socket.on('connect', () => {
    console.log('🔌 Socket connected in development mode');
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected in development mode');
  });
  
  socket.on('connect_error', (error) => {
    console.error('🔌 Socket connection error:', error);
  });
} 