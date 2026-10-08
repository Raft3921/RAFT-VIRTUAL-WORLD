// Eight members and the white guest in slot nine.
export const GYOZA_SKIN=7;
export const GUEST_SKIN=8;
export const MAX_PLAYERS=9;
export function playableSkin(value,fallback=3){
  const skin=Number(value);
  return Number.isInteger(skin)&&(skin===GUEST_SKIN||skin>=0&&skin<8)?skin:fallback;
}
