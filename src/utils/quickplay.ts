export const MIN_PLAYER_CAP = 18;
export const MAX_PLAYER_OPTIONS = [
  [24, 24], // Default
  [24, 32], // 24-32
  [MIN_PLAYER_CAP, 32], // 18-32
  [64, 100], // Any large
  [MIN_PLAYER_CAP, 100], // Don't care
];
export function getMaxPlayerIndex(setting) {
  let status = 0;
  for (const option of MAX_PLAYER_OPTIONS) {
    if (setting[0] === option[0] && setting[1] === option[1]) {
      break;
    }
    status++;
  }
  return status;
}
