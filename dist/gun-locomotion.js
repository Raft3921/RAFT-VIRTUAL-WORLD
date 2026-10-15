import {bounceSpeed} from './plaza-surfaces.js';
export const GUN_GRAVITY=24;
export const GUN_JUMP_SPEED=6.2;
// Compare apex height, rather than tripling launch velocity (which is 9x height).
export function tentBounceSpeed(incoming,pump=false){return bounceSpeed(incoming,pump)*Math.sqrt(3);}
