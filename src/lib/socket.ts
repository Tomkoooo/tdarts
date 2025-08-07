"use client";

import { io } from "socket.io-client";

// Socket inicializálása autoConnect: false opcióval
// Ez megakadályozza az automatikus kapcsolatot
export const socket = io({
  autoConnect: false,
  transports: ['websocket', 'polling']
}); 