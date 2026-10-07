import { DurableObject } from 'cloudflare:workers';
import { cleanState, GameRules,applyPlayerState,SYNC_VERSION } from '../../dist/game-rules.js';

const MAX_PLAYERS = 8;

function json(data) {
  return JSON.stringify(data);
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
    this.roomContext=ctx;
    this.players = new Map();
    this.scores={};this.ready=ctx.blockConcurrencyWhile(async()=>{this.scores=await ctx.storage.get('scores')||{};const settings=await ctx.storage.get('settings')||{},characters=await ctx.storage.get('characters')||{},houses=await ctx.storage.get('houses')||{};this.rules=new GameRules(this.players,m=>this.broadcast(m),this.scores,s=>ctx.storage.put('scores',s),settings,s=>ctx.storage.put('settings',s),characters,s=>ctx.storage.put('characters',s),houses,s=>ctx.storage.put('houses',s));});
  }

  async fetch(request) {
    await this.ready;
    if (this.players.size >= MAX_PLAYERS) return new Response('Room is full', { status: 409 });

    const url = new URL(request.url);
    const requestedSkin = Number(url.searchParams.get('skin'));
    const skin = Number.isInteger(requestedSkin) && requestedSkin >= 0 && requestedSkin < 7 ? requestedSkin : 3;
    const id = crypto.randomUUID();
    const spawn = this.players.size;
    const angle = spawn * 2.399;
    const profile=/^[a-f0-9-]{36}$/.test(url.searchParams.get('profile')||'')?url.searchParams.get('profile'):crypto.randomUUID();
    const player = {profile,...this.rules.character(skin,profile,url.searchParams.get('crown')==='1'),seated:false,
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

    this.roomContext.waitUntil(this.rules.characters.pending);
    server.send(json({ type: 'joined', version:SYNC_VERSION, houses:this.rules.houses.snapshots(), characters:this.rules.characters.snapshots(), self: player, players: [...this.players.values()].map(entry => entry.player).filter(other => other.id !== id) }));
    this.broadcast({ type: 'player-joined', player }, server);
    server.send(json(this.rules.snapshot()));
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
    if(!message||typeof message!=='object'||Array.isArray(message))return;
    if(message.type!=='state'){const pending=this.rules.receive(entry,message);if(pending?.then)this.roomContext.waitUntil(pending);return;}
    if (message.type !== 'state' || Date.now() - entry.lastStateAt < 25) return;

    const requestedSkin = Number(message.state?.skin);
    const skin = Number.isInteger(requestedSkin) && requestedSkin >= 0 && requestedSkin < 7 ? requestedSkin : entry.player.skin;
    const state = cleanState(message.state, skin);
    if (!state) return;
    if(state.skin!==entry.player.skin){if(!this.rules.selectCharacter(entry,state.skin))state.skin=entry.player.skin;this.roomContext.waitUntil(this.rules.characters.pending);}
    entry.lastStateAt = Date.now();
    applyPlayerState(entry.player,state);
    this.rules.state(entry);
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
    this.rules.removed(entry.player.id);
    this.broadcast({ type: 'player-left', id: entry.player.id });
  }
}
