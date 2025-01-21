export function expOut(t) {
  if (t >= 1.0) return 1.0;
  return 1.0 - Math.pow(2.0, -10.0 * t);
}

export function easeIn(t) {
  return Math.pow(t, 1.1);
}

export function getGrad(t) {
  return 1.0 - expOut(t);
}
