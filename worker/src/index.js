import { DurableObject } from 'cloudflare:workers';

const MAX_PLAYERS = 8;

function json(data) {
  return JSON.stringify(data);
}

function cleanState(state, skin) {
  const values = [state?.x, state?.y, state?.z, state?.yaw];
  if (!values.every(Number.isFinite)) return null;
  const [x, y, z, yaw] = values;
  if (Math.abs(x) > 1300 || y < 0 || y > 80 || Math.abs(z) > 1300) return null;
  return {
    x, y, z, yaw,
    headYaw: Number.isFinite(state.headYaw) ? Math.max(-1, Math.min(state.headYaw, 1)) : 0,
    headPitch: Number.isFinite(state.headPitch) ? Math.max(-.7, Math.min(state.headPitch, .7)) : 0,
    vx: Number.isFinite(state.vx) ? Math.max(-200, Math.min(state.vx, 200)) : 0,
    vy: Number.isFinite(state.vy) ? Math.max(-200, Math.min(state.vy, 200)) : 0,
    vz: Number.isFinite(state.vz) ? Math.max(-200, Math.min(state.vz, 200)) : 0,
    skin: Number.isInteger(skin) && skin >= 0 && skin < 7 ? skin : 3,
    gesture: ['none', 'wave', 'cheer', 'pose'].includes(state.gesture) ? state.gesture : 'none',
    speed: Number.isFinite(state.speed) ? Math.max(0, Math.min(state.speed, 20)) : 0,
    grounded: state.grounded !== false,
    verticalSpeed: Number.isFinite(state.verticalSpeed) ? Math.max(-30, Math.min(state.verticalSpeed, 30)) : 0,
    flight: state.flight === true,
    ragdoll: state.ragdoll === true,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response('ok');
    if (url.pathname !== '/room') return new Response('Not found', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('WebSocket upgrade required', { status: 426 });
    }

    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    if (!allowedOrigins.includes(origin)) return new Response('Origin not allowed', { status: 403 });

    const id = env.ROOMS.idFromName('raft-studio-global-room');
    return env.ROOMS.get(id).fetch(request);
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.players = new Map();
  }

  async fetch(request) {
    if (this.players.size >= MAX_PLAYERS) return new Response('Room is full', { status: 409 });

    const url = new URL(request.url);
    const requestedSkin = Number(url.searchParams.get('skin'));
    const skin = Number.isInteger(requestedSkin) && requestedSkin >= 0 && requestedSkin < 7 ? requestedSkin : 3;
    const id = crypto.randomUUID();
    const spawn = this.players.size;
    const angle = spawn * 2.399;
    const player = {
      id, skin,
      x: Math.sin(angle) * 3,
      y: 0,
      z: Math.cos(angle) * 3,
      yaw: Math.atan2(-Math.sin(angle), -Math.cos(angle)), headYaw: 0, headPitch: 0,
      gesture: 'none', speed: 0, grounded: true, verticalSpeed: 0, flight: false, ragdoll: false,
    };
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    this.players.set(server, { player, lastStateAt: 0 });

    server.send(json({ type: 'joined', self: player, players: [...this.players.values()].map(entry => entry.player).filter(other => other.id !== id) }));
    this.broadcast({ type: 'player-joined', player }, server);
    server.addEventListener('message', event => this.receive(server, event.data));
    server.addEventListener('close', () => this.remove(server));
    server.addEventListener('error', () => this.remove(server));

    return new Response(null, { status: 101, webSocket: client });
  }

  receive(socket, raw) {
    const entry = this.players.get(socket);
    if (!entry || typeof raw !== 'string' || raw.length > 2048) return;
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    if (message.type === 'punch') {
      const velocity = message.velocity;
      if (typeof message.target !== 'string' || !velocity || ![velocity.x, velocity.y, velocity.z].every(Number.isFinite)
        || Math.hypot(velocity.x, velocity.y, velocity.z) > 200) return;
      if (![...this.players.values()].some(target => target.player.id === message.target)) return;
      const damage = Number.isInteger(message.damage) ? Math.max(0, Math.min(message.damage, 10)) : 0;
      this.broadcast({ type: 'punch', target: message.target, damage, attacker: entry.player.id, velocity });
      return;
    }
    if (message.type === 'duel-ready') {
      this.broadcast({ type: 'duel-ready', id: entry.player.id });
      return;
    }
    if (message.type === 'duel-result' && typeof message.winner === 'string'
      && [...this.players.values()].some(target => target.player.id === message.winner)) {
      this.broadcast({ type: 'duel-result', winner: message.winner });
      return;
    }
    if (message.type !== 'state' || Date.now() - entry.lastStateAt < 25) return;

    const requestedSkin = Number(message.state?.skin);
    const skin = Number.isInteger(requestedSkin) && requestedSkin >= 0 && requestedSkin < 7 ? requestedSkin : entry.player.skin;
    const state = cleanState(message.state, skin);
    if (!state) return;
    entry.lastStateAt = Date.now();
    Object.assign(entry.player, state);
    this.broadcast({ type: 'state', player: entry.player }, socket);
  }

  broadcast(message, except = null) {
    const data = json(message);
    for (const [socket] of this.players) {
      if (socket === except) continue;
      try { socket.send(data); } catch { this.remove(socket); }
    }
  }

  remove(socket) {
    const entry = this.players.get(socket);
    if (!entry) return;
    this.players.delete(socket);
    this.broadcast({ type: 'player-left', id: entry.player.id });
  }
}
