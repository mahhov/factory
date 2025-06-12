let clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

export default {clamp};
