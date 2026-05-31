import { getSocket } from "./socket";

type MessageHandler = (peerId: string, data: any) => void;

interface PeerConn {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
}

export class WebRTCManager {
  private peers: Map<string, PeerConn> = new Map();
  private onMessage: MessageHandler | null = null;
  private onPeerConnect: ((peerId: string) => void) | null = null;
  private onPeerDisconnect: ((peerId: string) => void) | null = null;

  private isHost: boolean = false;

  constructor(isHost: boolean) {
    this.isHost = isHost;
    this.setupSignaling();
  }

  public setCallbacks(
    onMsg: MessageHandler,
    onConnect: (id: string) => void,
    onDisconnect: (id: string) => void
  ) {
    this.onMessage = onMsg;
    this.onPeerConnect = onConnect;
    this.onPeerDisconnect = onDisconnect;
  }

  private setupSignaling() {
    const socket = getSocket();

    socket.on("webrtc_offer", async ({ senderId, offer }) => {
      // Client receives offer from Host
      const { pc } = this.createPeer(senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc_answer", { targetId: senderId, answer });
    });

    socket.on("webrtc_answer", async ({ senderId, answer }) => {
      // Host receives answer from Client
      const peer = this.peers.get(senderId);
      if (peer) {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("webrtc_ice_candidate", async ({ senderId, candidate }) => {
      const peer = this.peers.get(senderId);
      if (peer) {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }

  // Host iterates over accepted clients and calls this
  public async establishConnection(targetClientId: string) {
    const { pc, dc } = this.createPeer(targetClientId);
    
    // Create the data channel on the host side
    this.setupDataChannel(targetClientId, dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    getSocket().emit("webrtc_offer", { targetId: targetClientId, offer });
  }

  private createPeer(peerId: string): PeerConn {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Data channel logic
    let dc: RTCDataChannel;
    if (this.isHost) {
      dc = pc.createDataChannel("game-data", { ordered: false, maxRetransmits: 0 }); // Fast UDP-like mode mapping
    } else {
      // Client has to wait for data channel to be passed in from Host
      dc = pc.createDataChannel("dummy"); // Placeholder, gets overridden
      pc.ondatachannel = (event) => {
        const receivedDc = event.channel;
        this.peers.set(peerId, { pc, dc: receivedDc });
        this.setupDataChannel(peerId, receivedDc);
      };
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        getSocket().emit("webrtc_ice_candidate", {
          targetId: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        console.log(`WebRTC Connected to ${peerId}`);
        // We will fire onPeerConnect once datachannel opens to be safe
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        console.log(`WebRTC Disconnected from ${peerId}`);
        this.onPeerDisconnect?.(peerId);
        this.peers.delete(peerId);
      }
    };

    const peerObj = { pc, dc };
    this.peers.set(peerId, peerObj);
    return peerObj;
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    dc.onopen = () => {
      console.log(`DataChannel open with ${peerId}`);
      this.onPeerConnect?.(peerId);
    };

    dc.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.onMessage?.(peerId, payload);
      } catch (err) {}
    };
  }

  public broadcast(data: any) {
    const payload = JSON.stringify(data);
    this.peers.forEach((peer) => {
      if (peer.dc.readyState === "open") {
        peer.dc.send(payload);
      }
    });
  }

  public sendTo(peerId: string, data: any) {
    const payload = JSON.stringify(data);
    const peer = this.peers.get(peerId);
    if (peer && peer.dc.readyState === "open") {
      peer.dc.send(payload);
    }
  }

  public cleanup() {
    this.peers.forEach((peer) => {
      peer.dc.close();
      peer.pc.close();
    });
    this.peers.clear();
    const socket = getSocket();
    socket.off("webrtc_offer");
    socket.off("webrtc_answer");
    socket.off("webrtc_ice_candidate");
  }
}
