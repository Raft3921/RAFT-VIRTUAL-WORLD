export const SYNC_VERSION='2026-10-17-vrs-mantle-135';
// Release labels identify updates; the protocol identifies connection compatibility.
export const SYNC_PROTOCOL=3;
export function compatibleSync(message){if(message?.protocol!==undefined)return message.protocol===SYNC_PROTOCOL;return message?.version===SYNC_VERSION||/^2026-10-10-vrs-(entry-37|countdown-38|victory-40|feedback-41|roster-46)$/.test(message?.version||'');}
