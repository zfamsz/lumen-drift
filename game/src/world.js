// The game's rules and state, with no drawing and no browser in it: the light-ship, the pools
// of lumen orbs, void shards, power-ups and particles, spawning, collisions, combos, waves,
// score and lives. step() advances one fixed step and returns what happened as bit flags, so
// the caller can react without the world knowing about screens or sound. Nothing here
// allocates after createWorld returns.

import {
  COMBO, FIELD, LIVES, ORB, POOL_ORBS, POOL_PARTICLES, POOL_POWERUPS, POOL_SHARDS,
  POWERUP, SHARD, SHIP, STAR_COUNT, WAVE,
} from './config.js';

export const KIND_ORB = 0;
export const KIND_SHARD = 1;
export const KIND_POWERUP = 2;

export const POWER_SHIELD = 0;
export const POWER_MAGNET = 1;
export const POWER_SLOW = 2;

export const EVENT_ORB = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_POWER = 8;
export const EVENT_WAVE = 16;
export const EVENT_DASH = 32;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const ship = {
    x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2,
    invulnerable: 0, dashTime: 0, dashCooldown: 0, shield: false,
  };
  const orbs = [];
  for (let i = 0; i < POOL_ORBS; i += 1) {
    orbs.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, radius: ORB.radius, pulse: 0 });
  }
  const shards = [];
  for (let i = 0; i < POOL_SHARDS; i += 1) {
    shards.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, radius: 16, spin: 0, angle: 0, points: 5 });
  }
  const powerups = [];
  for (let i = 0; i < POOL_POWERUPS; i += 1) {
    powerups.push({ active: false, x: 0, y: 0, kind: POWER_SHIELD, radius: POWERUP.radius, pulse: 0 });
  }
  const particles = [];
  for (let i = 0; i < POOL_PARTICLES; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ffffff' });
  }
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i += 1) {
    stars.push({ x: random() * FIELD.width, y: random() * FIELD.height, r: 0.6 + random() * 1.6, phase: random() * Math.PI * 2 });
  }

  const state = {
    ship, orbs, shards, powerups, particles, stars,
    score: 0, lives: LIVES, wave: 1, elapsed: 0,
    combo: 0, comboTimer: 0, mult: 1,
    orbTimer: 0, shardTimer: 0, powerTimer: 0,
    slowTimer: 0, magnetTimer: 0,
    collected: 0, bestCombo: 0, shardsDodged: 0,
  };

  function reset() {
    ship.x = FIELD.width / 2;
    ship.y = FIELD.height / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI / 2;
    ship.invulnerable = 0;
    ship.dashTime = 0;
    ship.dashCooldown = 0;
    ship.shield = false;
    for (const orb of orbs) orb.active = false;
    for (const shard of shards) shard.active = false;
    for (const powerup of powerups) powerup.active = false;
    for (const particle of particles) particle.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 1;
    state.elapsed = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.mult = 1;
    state.orbTimer = ORB.interval;
    state.shardTimer = SHARD.interval;
    state.powerTimer = POWERUP.interval;
    state.slowTimer = 0;
    state.magnetTimer = 0;
    state.collected = 0;
    state.bestCombo = 0;
    state.shardsDodged = 0;
  }

  function free(pool) {
    for (let i = 0; i < pool.length; i += 1) if (!pool[i].active) return pool[i];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const p = free(particles);
      if (!p) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.3 + random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.maxLife = 0.4 + random() * 0.4;
      p.life = p.maxLife;
      p.size = 2 + random() * 3;
      p.color = color;
    }
  }

  function spawnOrb() {
    const orb = free(orbs);
    if (!orb) return;
    // Drift in from a random edge, slowly, so the field always has something to chase.
    const edge = Math.floor(random() * 4);
    if (edge === 0) { orb.x = -ORB.radius; orb.y = random() * FIELD.height; orb.vx = ORB.drift * (0.5 + random()); orb.vy = (random() - 0.5) * ORB.drift; }
    else if (edge === 1) { orb.x = FIELD.width + ORB.radius; orb.y = random() * FIELD.height; orb.vx = -ORB.drift * (0.5 + random()); orb.vy = (random() - 0.5) * ORB.drift; }
    else if (edge === 2) { orb.x = random() * FIELD.width; orb.y = -ORB.radius; orb.vx = (random() - 0.5) * ORB.drift; orb.vy = ORB.drift * (0.5 + random()); }
    else { orb.x = random() * FIELD.width; orb.y = FIELD.height + ORB.radius; orb.vx = (random() - 0.5) * ORB.drift; orb.vy = -ORB.drift * (0.5 + random()); }
    orb.radius = ORB.radius * (0.85 + random() * 0.3);
    orb.pulse = random() * Math.PI * 2;
    orb.active = true;
  }

  function spawnShard() {
    const shard = free(shards);
    if (!shard) return;
    const speed = SHARD.speed + SHARD.speedPerWave * (state.wave - 1) + random() * SHARD.speedJitter;
    // Enter from a random edge, aimed roughly across the field.
    const edge = Math.floor(random() * 4);
    const angle = random() * Math.PI * 2;
    if (edge === 0) { shard.x = -30; shard.y = random() * FIELD.height; }
    else if (edge === 1) { shard.x = FIELD.width + 30; shard.y = random() * FIELD.height; }
    else if (edge === 2) { shard.x = random() * FIELD.width; shard.y = -30; }
    else { shard.x = random() * FIELD.width; shard.y = FIELD.height + 30; }
    // Bias the velocity inward so shards cross the playfield instead of hugging the edge.
    const cx = FIELD.width / 2 - shard.x;
    const cy = FIELD.height / 2 - shard.y;
    const cl = Math.hypot(cx, cy) || 1;
    const inward = 0.55 + random() * 0.3;
    shard.vx = (cx / cl * inward + Math.cos(angle) * (1 - inward)) * speed;
    shard.vy = (cy / cl * inward + Math.sin(angle) * (1 - inward)) * speed;
    shard.radius = SHARD.radiusMin + random() * (SHARD.radiusMax - SHARD.radiusMin);
    shard.spin = (random() - 0.5) * 4;
    shard.angle = random() * Math.PI * 2;
    shard.points = 5 + Math.floor(random() * 3);
    shard.active = true;
  }

  function spawnPowerup() {
    const powerup = free(powerups);
    if (!powerup) return;
    // Away from the ship, so the player has to go and get it.
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 8; tries += 1) {
      x = 60 + random() * (FIELD.width - 120);
      y = 60 + random() * (FIELD.height - 120);
      if (dist2(x, y, ship.x, ship.y) > 220 * 220) break;
    }
    powerup.x = x;
    powerup.y = y;
    powerup.kind = Math.floor(random() * 3);
    powerup.pulse = 0;
    powerup.active = true;
  }

  function shardInterval() {
    return Math.max(SHARD.minInterval, SHARD.interval * SHARD.intervalScale ** (state.wave - 1));
  }

  /**
   * One fixed step. `control` is { tx, ty, kx, ky, dash }: the pointer target in field
   * coordinates (or null), the held-key thrust (-1..1 each axis) and a dash request. With
   * `harmless` set (the title screen's backdrop) things drift but nothing touches the ship
   * and nothing scores.
   */
  function step(dt, control, harmless) {
    let events = 0;
    state.elapsed += dt;
    const wave = Math.min(WAVE.max, 1 + Math.floor(state.elapsed / WAVE.seconds));
    if (wave !== state.wave) {
      state.wave = wave;
      if (!harmless) {
        state.score += WAVE.clearBonus;
        events |= EVENT_WAVE;
      }
    }

    const scale = state.slowTimer > 0 ? POWERUP.slowScale : 1;
    if (state.slowTimer > 0) state.slowTimer = Math.max(0, state.slowTimer - dt);
    if (state.magnetTimer > 0) state.magnetTimer = Math.max(0, state.magnetTimer - dt);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.mult = 1;
      }
    }

    // --- Ship ---
    if (harmless) {
      ship.x = FIELD.width / 2;
      ship.y = FIELD.height / 2 + Math.sin(state.elapsed * 0.8) * 12;
      ship.angle = -Math.PI / 2 + Math.sin(state.elapsed * 0.5) * 0.15;
      ship.vx = 0;
      ship.vy = 0;
    } else {
      let ax = 0;
      let ay = 0;
      if (control && control.tx !== null && control.tx !== undefined) {
        const dx = control.tx - ship.x;
        const dy = control.ty - ship.y;
        const d = Math.hypot(dx, dy);
        if (d > 10) {
          ax += dx / d;
          ay += dy / d;
        }
      }
      if (control) {
        ax += control.kx || 0;
        ay += control.ky || 0;
      }
      const len = Math.hypot(ax, ay);
      if (len > 1) {
        ax /= len;
        ay /= len;
      }
      ship.vx += ax * SHIP.accel * dt;
      ship.vy += ay * SHIP.accel * dt;
      const drag = Math.max(0, 1 - SHIP.drag * dt);
      ship.vx *= drag;
      ship.vy *= drag;
      const speed = Math.hypot(ship.vx, ship.vy);
      const cap = ship.dashTime > 0 ? SHIP.dashSpeed : SHIP.maxSpeed;
      if (speed > cap) {
        ship.vx = ship.vx / speed * cap;
        ship.vy = ship.vy / speed * cap;
      }
      if (speed > 30) ship.angle = Math.atan2(ship.vy, ship.vx);
      ship.x = Math.min(FIELD.width - SHIP.radius, Math.max(SHIP.radius, ship.x + ship.vx * dt));
      ship.y = Math.min(FIELD.height - SHIP.radius, Math.max(SHIP.radius, ship.y + ship.vy * dt));

      if (ship.invulnerable > 0) ship.invulnerable = Math.max(0, ship.invulnerable - dt);
      if (ship.dashTime > 0) ship.dashTime = Math.max(0, ship.dashTime - dt);
      if (ship.dashCooldown > 0) ship.dashCooldown = Math.max(0, ship.dashCooldown - dt);

      if (control && control.dash && ship.dashCooldown === 0) {
        let dx = ship.vx;
        let dy = ship.vy;
        let d = Math.hypot(dx, dy);
        if (d < 50) {
          dx = Math.cos(ship.angle);
          dy = Math.sin(ship.angle);
          d = 1;
        }
        ship.vx = dx / d * SHIP.dashSpeed;
        ship.vy = dy / d * SHIP.dashSpeed;
        ship.dashTime = SHIP.dashTime;
        ship.dashCooldown = SHIP.dashCooldown;
        ship.invulnerable = Math.max(ship.invulnerable, SHIP.dashTime + 0.12);
        burst(ship.x, ship.y, '#7df9ff', 10, 160);
        events |= EVENT_DASH;
      }
    }

    // --- Spawning (world time slows, the ship does not) ---
    const wdt = dt * scale;
    state.orbTimer -= wdt;
    if (state.orbTimer <= 0) {
      spawnOrb();
      state.orbTimer += ORB.interval + random() * ORB.intervalJitter;
    }
    state.shardTimer -= wdt;
    if (state.shardTimer <= 0) {
      spawnShard();
      state.shardTimer += shardInterval();
    }
    state.powerTimer -= wdt;
    if (state.powerTimer <= 0) {
      spawnPowerup();
      state.powerTimer += POWERUP.interval + random() * POWERUP.intervalJitter;
    }

    // --- Orbs ---
    for (let i = 0; i < orbs.length; i += 1) {
      const orb = orbs[i];
      if (!orb.active) continue;
      orb.pulse += wdt * 4;
      if (state.magnetTimer > 0 && !harmless) {
        const d2 = dist2(orb.x, orb.y, ship.x, ship.y);
        if (d2 < POWERUP.magnetRadius * POWERUP.magnetRadius) {
          const d = Math.sqrt(d2) || 1;
          orb.vx += (ship.x - orb.x) / d * 950 * wdt;
          orb.vy += (ship.y - orb.y) / d * 950 * wdt;
        }
      }
      orb.x += orb.vx * wdt;
      orb.y += orb.vy * wdt;
      if (orb.x < -60 || orb.x > FIELD.width + 60 || orb.y < -60 || orb.y > FIELD.height + 60) {
        orb.active = false;
        continue;
      }
      if (harmless) continue;
      const reach = orb.radius + SHIP.radius + 6;
      if (dist2(orb.x, orb.y, ship.x, ship.y) < reach * reach) {
        orb.active = false;
        state.collected += 1;
        state.combo += 1;
        state.comboTimer = COMBO.window;
        state.mult = 1 + Math.min(COMBO.maxMult - 1, Math.floor(state.combo / COMBO.step));
        if (state.combo > state.bestCombo) state.bestCombo = state.combo;
        state.score += ORB.points * state.mult;
        burst(orb.x, orb.y, '#ffd94d', 12, 200);
        events |= EVENT_ORB;
      }
    }

    // --- Shards ---
    for (let i = 0; i < shards.length; i += 1) {
      const shard = shards[i];
      if (!shard.active) continue;
      shard.angle += shard.spin * wdt;
      shard.x += shard.vx * wdt;
      shard.y += shard.vy * wdt;
      if (shard.x < -80 || shard.x > FIELD.width + 80 || shard.y < -80 || shard.y > FIELD.height + 80) {
        shard.active = false;
        if (!harmless) state.shardsDodged += 1;
        continue;
      }
      if (harmless || ship.invulnerable > 0) continue;
      const reach = shard.radius * 0.85 + SHIP.radius;
      if (dist2(shard.x, shard.y, ship.x, ship.y) < reach * reach) {
        shard.active = false;
        if (ship.shield) {
          ship.shield = false;
          burst(shard.x, shard.y, '#4dc9ff', 16, 260);
          events |= EVENT_HIT;
        } else {
          state.lives -= 1;
          state.combo = 0;
          state.mult = 1;
          state.comboTimer = 0;
          ship.invulnerable = SHIP.invulnerable;
          burst(ship.x, ship.y, '#ff4d6d', 22, 300);
          events |= EVENT_HIT;
          if (state.lives === 0) {
            events |= EVENT_OVER;
            break;
          }
        }
      }
    }

    // --- Power-ups ---
    for (let i = 0; i < powerups.length; i += 1) {
      const powerup = powerups[i];
      if (!powerup.active) continue;
      powerup.pulse += wdt * 3;
      if (harmless) continue;
      const reach = powerup.radius + SHIP.radius + 6;
      if (dist2(powerup.x, powerup.y, ship.x, ship.y) < reach * reach) {
        powerup.active = false;
        if (powerup.kind === POWER_SHIELD) ship.shield = true;
        else if (powerup.kind === POWER_MAGNET) state.magnetTimer = POWERUP.magnetTime;
        else state.slowTimer = POWERUP.slowTime;
        burst(powerup.x, powerup.y, '#c9a7ff', 14, 220);
        events |= EVENT_POWER;
      }
    }

    // --- Particles ---
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (!p.active) continue;
      p.life -= wdt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * wdt;
      p.y += p.vy * wdt;
      p.vx *= Math.max(0, 1 - 2 * wdt);
      p.vy *= Math.max(0, 1 - 2 * wdt);
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
