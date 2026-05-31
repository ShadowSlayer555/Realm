import { io, Socket } from "socket.io-client";

// In development/production, our Vite dev server or Node server runs on the same host
// so we don't need a full URL if it's served from the same domain.
const URL = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

let globalSocket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!globalSocket) {
    globalSocket = io(URL, {
      autoConnect: true,
    });
  }
  return globalSocket;
};
