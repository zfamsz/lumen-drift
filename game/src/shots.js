// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot: chase the
// nearest orb, and keep clear of shards that are closing in. The play scene's pilot looks
// well ahead and dashes out of trouble; the end scene's pilot chases orbs and ignores the
// shards, so it is caught out once the waves speed up, as a hurried player is.

import { FIELD, SHIP, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 600;
const DANGER_RADIUS = 150;
const DASH_RADIUS = 95;

/** The nearest active orb, or null when the field holds none. */
function nearestOrb(state) {
  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < state.orbs.length; i += 1) {
    const orb = state.orbs[i];
    if (!orb.active) continue;
    const dx = orb.x - state.ship.x;
    const dy = orb.y - state.ship.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = orb;
    }
  }
  return best;
}

/** True when a shard is close and moving toward the ship. */
function shardClosing(state, radius) {
  const ship = state.ship;
  for (let i = 0; i < state.shards.length; i += 1) {
    const shard = state.shards[i];
    if (!shard.active) continue;
    const dx = shard.x - ship.x;
    const dy = shard.y - ship.y;
    const d = Math.hypot(dx, dy);
    if (d > radius) continue;
    // Closing when its velocity points at the ship.
    if (dx * shard.vx + dy * shard.vy < 0) return true;
  }
  return false;
}

/**
 * Steer toward `target` (field coordinates), but veer away from a closing shard: the escape
 * direction is perpendicular to the shard's line of approach, away from it.
 */
function autopilot(state, target, avoid) {
  const ship = state.ship;
  let tx = target ? target.x : FIELD.width / 2;
  let ty = target ? target.y : FIELD.height / 2;
  let dash = false;
  if (avoid) {
    for (let i = 0; i < state.shards.length; i += 1) {
      const shard = state.shards[i];
      if (!shard.active) continue;
      const dx = shard.x - ship.x;
      const dy = shard.y - ship.y;
      const d = Math.hypot(dx, dy);
      if (d > DANGER_RADIUS) continue;
      if (dx * shard.vx + dy * shard.vy >= 0) continue;
      // Flee: run perpendicular to the shard's velocity, away from the shard.
      const px = -shard.vy;
      const py = shard.vx;
      const pl = Math.hypot(px, py) || 1;
      const away = (ship.x - shard.x) * px + (ship.y - shard.y) * py >= 0 ? 1 : -1;
      tx = ship.x + px / pl * 200 * away;
      ty = ship.y + py / pl * 200 * away;
      if (d < DASH_RADIUS && ship.dashCooldown === 0) dash = true;
      break;
    }
  }
  return { tx, ty, kx: 0, ky: 0, dash };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, null, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const avoid = name === 'play';
  for (let i = 0; i < limit / STEP; i += 1) {
    const orb = nearestOrb(world.state);
    const control = autopilot(world.state, orb, avoid);
    if (world.step(STEP, control, false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
