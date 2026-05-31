# Agent Knowledge Transfer & Architectural Guidelines (The "OfflineGame" Playbook)

## 1. The Core Paradigm
- **The Core Goal:** Build "Offline" Multiplayer Games. Players connect devices directly to each other **locally**, without relying on external cloud servers for game logic.
- **The Tech Stack:** TypeScript, React (18+), Vite, Tailwind CSS, and `lucide-react`.
- **Repository Management:** Maintain a pristine project structure. Never clutter the root directory with temporary test scripts (e.g., `test-mqtt.cjs`). Clean up test files immediately after use.

## 2. Networking Architecture (WebRTC First)
**⚠️ CRITICAL RULE: NO CENTRAL SERVERS.** 
Do not use `socket.io`, MQTT brokers, or a persistent Node.js/Cloud backend for game connection.
- **Signaling Phase:** Use QR Codes (via `QRScanner.tsx`) to pass WebRTC SDP offers/answers and ICE candidates physically/visually between devices, bypassing the need for an online signaling server.
- **Data Transport:** Execute all real-time inputs and game state syncs exclusively over WebRTC `RTCDataChannel`.
- **The Host-Client Relationship:** One device acts as the **Host** (`isHost: true`), and the other acts as the **Client**.
  - The Host computes the "Authoritative State" (physics collisions, scoring, etc.).
  - The Client sends inputs and renders the received state. Meticulously separate `isHost` logic in the game loops.

## 3. Game Engineering & Physics Modules
### A. Matter.js Pitfalls
When working with `matter-js`, use this secure import fallback if Vite aggressively botches the CommonJS / Default Export resolution:
```typescript
const M3 = MatterPkg.Engine ? MatterPkg : (MatterPkg as any).default || MatterPkg;
```

### B. React Effect Lifecycle & Memory Leaks
Game inner loops and Canvas renders run frequently. Always clean up after them to prevent exponential multiplication in React strict mode or on unmounts.
- **Clear intervals, animations, and engines:**
```typescript
useEffect(() => {
  const loop = setInterval(() => { /* game logic */ }, 1000 / 60);
  const reqId = requestAnimationFrame(draw);
  
  return () => {
    clearInterval(loop);
    cancelAnimationFrame(reqId);
    // If using matter.js, also call: Engine.clear(engine);
  };
}, []);
```

## 4. Game Roster & Design Patterns
- **Turn-based / Discrete Event Games (Chess, CardBattleGround):** Event-driven logic. No 60fps loop is needed. Send state changes via WebRTC strictly when turns occurs.
- **Continuous Physics Games (Rocket League, Pong):** Rely on fixed tick-rate `setInterval` logic updates and interpolated canvas rendering.
- **Rhythm Games (Magic Tiles):** Driven heavily by the HTML5 Canvas API and `requestAnimationFrame` for precise millisecond timing routines.

## 5. Standard Practices
1. **Never Mock Data:** Build real peer-to-peer data integrations.
2. **Pristine UIs:** Use deliberate, clean, and intentional Tailwind CSS designs. Avoid adding unrequested "techy" metadata or decorative AI-slop sci-fi UI layers. 
3. **Module Reuse:** Reuse existing shared utilities (like `webrtc.ts` or `audioManager.ts` if they are in the file tree) rather than rewriting from scratch for every game.
