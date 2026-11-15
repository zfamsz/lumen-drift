// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const SHIP = {
  radius: 14,
  accel: 2400,
  maxSpeed: 430,
  drag: 1.9,
  dashSpeed: 950,
  dashTime: 0.18,
  dashCooldown: 2.2,
  invulnerable: 1.6,
};

export const LIVES = 3;

export const ORB = {
  radius: 11,
  points: 10,
  interval: 0.85,
  intervalJitter: 0.5,
  drift: 46,
  valueJitter: 0.5,
};

export const SHARD = {
  interval: 1.15,
  intervalScale: 0.88,
  minInterval: 0.32,
  speed: 155,
  speedPerWave: 24,
  speedJitter: 70,
  radiusMin: 12,
  radiusMax: 27,
};

export const POWERUP = {
  interval: 15,
  intervalJitter: 7,
  radius: 14,
  magnetRadius: 300,
  magnetTime: 6,
  slowTime: 3,
  slowScale: 0.45,
};

/** Combo: collecting orbs quickly chains them; every COMBO.step orbs the multiplier grows. */
export const COMBO = { window: 2.5, step: 4, maxMult: 5 };

/** Seconds of play per wave; speeds and spawn rates stop growing at the last wave. */
export const WAVE = { seconds: 20, max: 10, clearBonus: 100 };

/** How many of each thing can exist at once; the pools are allocated once, at boot. */
export const POOL_ORBS = 48;
export const POOL_SHARDS = 48;
export const POOL_POWERUPS = 6;
export const POOL_PARTICLES = 180;
export const STAR_COUNT = 110;

export const PALETTE = {
  backdrop: '#070812',
  nebulaA: '#1b2a5e',
  nebulaB: '#3b1d5e',
  nebulaC: '#0e3a4a',
  star: '#dfe8ff',
  ship: '#7df9ff',
  shipCore: '#eaffff',
  engine: '#ffb347',
  orb: '#ffd94d',
  orbCore: '#fff7cc',
  shard: '#8a2be2',
  shardEdge: '#ff4d6d',
  shield: '#4dc9ff',
  magnet: '#7CFC9A',
  slow: '#c9a7ff',
  panel: '#141a2e',
  panelEdge: '#2c3a63',
  text: '#eef1f5',
  muted: '#9aa5c0',
  danger: '#ff5d73',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-drift.best';
