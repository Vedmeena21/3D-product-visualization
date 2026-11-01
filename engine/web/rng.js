// Small seeded generator (xorshift32 seeded through a splitmix step) so procedural detail is the same on every load.
export function rng(seed = 1) {
  let s = (seed ^ 0x9e3779b9) >>> 0 || 1;
  s = Math.imul(s ^ (s >>> 16), 0x85ebca6b) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}
