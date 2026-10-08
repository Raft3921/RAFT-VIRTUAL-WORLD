// Shared by room authority and local practice actors. Ordinary combo taps
// never cancel the opponent's attack; only a finisher/charged hit downs them.
export const DOWN_PROTECTION_SECONDS=1.5;
export const DOWN_REST_SECONDS=.48;
export const RECOVERY_SECONDS=1.02;
export function knocksDown(kind,held=0,projectile=false){return projectile||held>=1||kind===3;}
export function protectedFromHit(player,now){return player.ragdoll===true||now<(player.protectedUntil||0);}
