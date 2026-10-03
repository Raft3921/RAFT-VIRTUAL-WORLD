const host = location.hostname;
const octets = host.split('.').map(Number);
const privateIPv4 = octets.length === 4 && octets.every(value => Number.isInteger(value) && value >= 0 && value <= 255)
	&& (octets[0] === 10 || (octets[0] === 192 && octets[1] === 168)
		|| (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
const localHost = host === 'localhost' || host.endsWith('.local') || privateIPv4;
const localEndpoint = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/room`;
export const SYNC_ENDPOINT = localHost
	? localEndpoint
	: 'wss://raft-studio-room-sync.minecraft-studio.workers.dev/room';