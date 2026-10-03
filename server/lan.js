import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';

const root = resolve('dist');
const port = Number(process.env.PORT || 4173);
const maxPlayers = 8;
const players = new Map();
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(message, except = null) {
  for (const socket of players.keys()) {
    if (socket !== except) send(socket, message);
  }
}

function cleanState(state, skin) {
  const values = [state?.x, state?.y, state?.z, state?.yaw];
  if (!values.every(Number.isFinite)) return null;
  const [x, y, z, yaw] = values;
  if (Math.abs(x) > 1300 || y < 0 || y > 80 || Math.abs(z) > 1300) return null;
  const bounded = (value, limit) => Number.isFinite(value) ? Math.max(-limit, Math.min(value, limit)) : 0;
  return {
    x, y, z, yaw,
    headYaw: bounded(state.headYaw, 1),
    headPitch: bounded(state.headPitch, .7),
    vx: bounded(state.vx, 200),
    vy: bounded(state.vy, 200),
    vz: bounded(state.vz, 200),
    skin: Number.isInteger(skin) && skin >= 0 && skin < 7 ? skin : 3,
    gesture: ['none', 'wave', 'cheer', 'pose'].includes(state.gesture) ? state.gesture : 'none',
    speed: Number.isFinite(state.speed) ? Math.max(0, Math.min(state.speed, 20)) : 0,
    grounded: state.grounded !== false,
    verticalSpeed: bounded(state.verticalSpeed, 30),
    flight: state.flight === true,
    ragdoll: state.ragdoll === true,
  };
}

function remove(socket) {
  const entry = players.get(socket);
  if (!entry) return;
  players.delete(socket);
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
  const skin = Number.isInteger(requestedSkin) && requestedSkin >= 0 && requestedSkin < 7 ? requestedSkin : 3;
  const spawn = players.size;
  const angle = spawn * 2.399;
  const player = {
    id: crypto.randomUUID(), skin,
    x: Math.sin(angle) * 3, y: 0, z: Math.cos(angle) * 3,
    yaw: Math.atan2(-Math.sin(angle), -Math.cos(angle)),
    headYaw: 0, headPitch: 0, vx: 0, vy: 0, vz: 0,
    gesture: 'none', speed: 0, grounded: true, verticalSpeed: 0, flight: false, ragdoll: false,
  };
  players.set(socket, { player, lastStateAt: 0 });
  send(socket, { type: 'joined', self: player, players: [...players.values()].map(entry => entry.player).filter(other => other.id !== player.id) });
  broadcast({ type: 'player-joined', player }, socket);

  socket.on('message', raw => {
    const entry = players.get(socket);
    if (!entry || raw.length > 2048) return;
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if (message.type === 'punch') {
      const impulse = message.velocity;
      if (typeof message.target !== 'string' || !impulse || ![impulse.x, impulse.y, impulse.z].every(Number.isFinite)
        || Math.hypot(impulse.x, impulse.y, impulse.z) > 200) return;
      if (![...players.values()].some(target => target.player.id === message.target)) return;
      broadcast({ type: 'punch', target: message.target, velocity: impulse });
      return;
    }
    if (message.type !== 'state' || Date.now() - entry.lastStateAt < 25) return;
    const requestedSkin = Number(message.state?.skin);
    const state = cleanState(message.state, requestedSkin);
    if (!state) return;
    Object.assign(entry.player, state);
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