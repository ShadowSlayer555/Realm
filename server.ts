import express from "express";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Initialize Socket.io
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  const PORT = 3000;

  // Lobby State
  // We'll store online hosts here
  interface HostLobby {
    id: string; // Socket ID
    name: string;
    details: string; // e.g. "Level 5, 2/4 Players"
  }
  
  const activeHosts = new Map<string, HostLobby>();

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Let clients get the list of active hosts when they join the lobby browser
    socket.on("get_hosts", () => {
      socket.emit("hosts_list", Array.from(activeHosts.values()));
    });

    // A user registers as a host
    socket.on("register_host", (data: { name: string; details: string }) => {
      activeHosts.set(socket.id, {
        id: socket.id,
        name: data.name,
        details: data.details,
      });
      console.log(`Host registered: ${data.name} (${socket.id})`);
      io.emit("hosts_list", Array.from(activeHosts.values())); // Broadcast updated list
    });

    // Handle join requests
    socket.on("request_join", (data: { hostId: string; playerName: string; playerDetails: any }) => {
      // Send the request to the specific host
      io.to(data.hostId).emit("join_request", {
        clientId: socket.id,
        playerName: data.playerName,
        playerDetails: data.playerDetails,
      });
    });

    // Host responds to join request
    socket.on("join_response", (data: { clientId: string; accepted: boolean; reason?: string }) => {
      io.to(data.clientId).emit("join_result", {
        hostId: socket.id,
        accepted: data.accepted,
        reason: data.reason
      });
    });

    // WebRTC Signaling
    socket.on("webrtc_offer", (data: { targetId: string; offer: RTCSessionDescriptionInit }) => {
      io.to(data.targetId).emit("webrtc_offer", {
        senderId: socket.id,
        offer: data.offer,
      });
    });

    socket.on("webrtc_answer", (data: { targetId: string; answer: RTCSessionDescriptionInit }) => {
      io.to(data.targetId).emit("webrtc_answer", {
        senderId: socket.id,
        answer: data.answer,
      });
    });

    socket.on("webrtc_ice_candidate", (data: { targetId: string; candidate: RTCIceCandidateInit }) => {
      io.to(data.targetId).emit("webrtc_ice_candidate", {
        senderId: socket.id,
        candidate: data.candidate,
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      if (activeHosts.has(socket.id)) {
        activeHosts.delete(socket.id);
        io.emit("hosts_list", Array.from(activeHosts.values()));
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
