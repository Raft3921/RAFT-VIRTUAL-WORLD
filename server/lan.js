import { createReadStream, existsSync, statSync, readFileSync, writeFileSync,renameSync } from 'node:fs';
import { cleanState, GameRules,applyPlayerState,SYNC_VERSION } from '../dist/game-rules.js';
import {GUEST_SKIN,MAX_PLAYERS,playableSkin} from '../dist/player-types.js';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';

const root = resolve('dist');
const port = Number(process.env.PORT || 4173);
const maxPlayers = MAX_PLAYERS;
const players = new Map();
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jem': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
};

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(message, except = null) {
  for (const socket of players.keys()) {
    if (socket !== except) send(socket, message);
  }
}

let scores={};try{scores=JSON.parse(readFileSync('.room-scores.json','utf8'));}catch{}
let settings={};try{settings=JSON.parse(readFileSync('.room-settings.json','utf8'));}catch{}
let characters={};try{characters=JSON.parse(readFileSync('.room-characters.json','utf8'));}catch{}
let houses={};try{houses=JSON.parse(readFileSync('.room-houses.json','utf8'));}catch{}
const rules=new GameRules(players,broadcast,scores,s=>writeFileSync('.room-scores.json',JSON.stringify(s)),settings,s=>{writeFileSync('.room-settings.json.tmp',JSON.stringify(s));renameSync('.room-settings.json.tmp','.room-settings.json');},characters,s=>{writeFileSync('.room-characters.json.tmp',JSON.stringify(s));renameSync('.room-characters.json.tmp','.room-characters.json');},houses,s=>{writeFileSync('.room-houses.json.tmp',JSON.stringify(s));renameSync('.room-houses.json.tmp','.room-houses.json');});

function remove(socket) {
  const entry = players.get(socket);
  if (!entry) return;
  players.delete(socket);
  rules.removed(entry.player.id);
  broadcast({ type: 'player-left', id: entry.player.id });
}

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end('ok');
    return;
  }
  const relative = pathname === '/' ? '/index.html' : pathname;
  const file = resolve(root, `.${relative}`);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, {
    'Content-Type': mime[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(file).pipe(response);
});

const sockets = new WebSocketServer({ noServer: true, maxPayload: 4096 });
server.on('upgrade', (request, socket, head) => {
  let url;
  try { url = new URL(request.url, `http://${request.headers.host || 'localhost'}`); }
  catch { socket.destroy(); return; }
  if (url.pathname !== '/room' || request.headers.origin !== `http://${request.headers.host}`) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  if (players.size >= maxPlayers) {
    socket.write('HTTP/1.1 409 Room Full\r\n\r\n');
    socket.destroy();
    return;
  }
  sockets.handleUpgrade(request, socket, head, client => sockets.emit('connection', client, request));
});

sockets.on('connection', (socket, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedSkin = Number(url.searchParams.get('skin'));
  const skin = playableSkin(requestedSkin);
  const spawn = players.size;
  const angle = spawn * 2.399;
  const profile=/^[a-f0-9-]{36}$/.test(url.searchParams.get('profile')||'')?url.searchParams.get('profile'):crypto.randomUUID();
  const player = {profile,flashlightEnabled:rules.flashlightPreference(profile),...rules.character(skin,profile,url.searchParams.get('crown')==='1'),seated:false,
    id: crypto.randomUUID(), skin, guest:skin===GUEST_SKIN,
    x: Math.sin(angle) * 3, y: 0, z: Math.cos(angle) * 3,
    yaw: Math.atan2(-Math.sin(angle), -Math.cos(angle)),
    headYaw: 0, headPitch: 0, vx: 0, vy: 0, vz: 0,
    gesture: 'none', speed: 0, grounded: true, verticalSpeed: 0, flight: false, ragdoll: false,
  };
  players.set(socket, { player, lastStateAt: 0 });
  send(socket, { type: 'joined', version:SYNC_VERSION, projectiles:rules.projectiles.map(({previous,match,...projectile})=>projectile), houses:rules.houses.snapshots(), characters:rules.characters.snapshots(), self: player, players: [...players.values()].map(entry => entry.player).filter(other => other.id !== player.id) });
  broadcast({ type: 'player-joined', player }, socket);
  send(socket,rules.snapshot());

  socket.on('message', raw => {
    const entry = players.get(socket);
    if (!entry || raw.length > 2048) return;
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if(!message||typeof message!=='object'||Array.isArray(message))return;
    if(message.type!=='state'){rules.receive(entry,message);return;}
    if (message.type !== 'state' || Date.now() - entry.lastStateAt < 25) return;
    const requestedSkin = Number(message.state?.skin);
    const state = cleanState(message.state, requestedSkin);
    if (!state) return;
    if(state.skin!==entry.player.skin&&!rules.selectCharacter(entry,state.skin))state.skin=entry.player.skin;
    applyPlayerState(entry.player,state);
    rules.state(entry);
    entry.lastStateAt = Date.now();
    broadcast({ type: 'state', player: entry.player }, socket);
  });
  socket.on('close', () => remove(socket));
  socket.on('error', () => remove(socket));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`LAN studio: http://localhost:${port}/`);
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses || []) {
      const octets = address.address.split('.').map(Number);
      const privateIPv4 = octets.length === 4 && (octets[0] === 10 || (octets[0] === 192 && octets[1] === 168)
        || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
      if (address.family === 'IPv4' && !address.internal && privateIPv4) console.log(`LAN studio: http://${address.address}:${port}/`);
    }
  }
});
