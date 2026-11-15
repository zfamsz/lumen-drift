// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Nebula gradients, twinkling stars, glowing orbs, jagged void shards, a light-ship
// with an engine flame, canvas text for the HUD and the panels.

import { FIELD, FONT, LIVES, PALETTE, POWERUP, SHIP } from './config.js';
import { POWER_MAGNET, POWER_SHIELD, POWER_SLOW } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 720, top: 150, line: 34, bottom: 74 };
const TAU = Math.PI * 2;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const waveLabel = cachedLabel('WAVE ');
  const finalLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');
  const orbsLabel = cachedLabel('ORBS ');
  const comboLabel = cachedLabel('BEST COMBO ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function glowCircle(x, y, radius, color) {
    const g = context.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = g;
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fill();
  }

  function drawBackground(state) {
    const g = context.createLinearGradient(0, 0, FIELD.width, FIELD.height);
    g.addColorStop(0, '#0a0d24');
    g.addColorStop(0.5, '#0d1026');
    g.addColorStop(1, '#120a24');
    context.fillStyle = g;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Three fixed nebula clouds, soft and out of focus.
    glowCircle(300, 200, 320, 'rgba(27,42,94,0.55)');
    glowCircle(1020, 160, 300, 'rgba(59,29,94,0.5)');
    glowCircle(640, 560, 340, 'rgba(14,58,74,0.45)');

    for (let i = 0; i < state.stars.length; i += 1) {
      const s = state.stars[i];
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(state.elapsed * 1.4 + s.phase));
      context.globalAlpha = tw;
      context.fillStyle = PALETTE.star;
      context.fillRect(s.x, s.y, s.r, s.r);
    }
    context.globalAlpha = 1;
  }

  function drawShip(state) {
    const ship = state.ship;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (ship.invulnerable > 0 && Math.floor(ship.invulnerable * 10) % 2 === 0) return;
    const speed = Math.hypot(ship.vx, ship.vy);
    context.save();
    context.translate(ship.x, ship.y);
    context.rotate(ship.angle);
    if (speed > 40) {
      const flame = 14 + Math.min(18, speed / 24) + Math.sin(state.elapsed * 40) * 4;
      context.fillStyle = PALETTE.engine;
      context.globalAlpha = 0.85;
      context.beginPath();
      context.moveTo(-SHIP.radius, -6);
      context.lineTo(-SHIP.radius - flame, 0);
      context.lineTo(-SHIP.radius, 6);
      context.closePath();
      context.fill();
      context.globalAlpha = 1;
    }
    glowCircle(0, 0, SHIP.radius * 2.6, 'rgba(125,249,255,0.28)');
    context.fillStyle = PALETTE.ship;
    context.beginPath();
    context.moveTo(SHIP.radius + 8, 0);
    context.lineTo(-SHIP.radius, -SHIP.radius * 0.8);
    context.lineTo(-SHIP.radius * 0.45, 0);
    context.lineTo(-SHIP.radius, SHIP.radius * 0.8);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.shipCore;
    context.beginPath();
    context.arc(2, 0, 5, 0, TAU);
    context.fill();
    context.restore();

    if (ship.shield) {
      context.strokeStyle = PALETTE.shield;
      context.globalAlpha = 0.65 + 0.35 * Math.sin(state.elapsed * 5);
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(ship.x, ship.y, SHIP.radius + 12, 0, TAU);
      context.stroke();
      context.globalAlpha = 1;
    }
  }

  function drawOrbs(state) {
    for (let i = 0; i < state.orbs.length; i += 1) {
      const orb = state.orbs[i];
      if (!orb.active) continue;
      const pulse = 1 + 0.18 * Math.sin(orb.pulse);
      glowCircle(orb.x, orb.y, orb.radius * 2.6 * pulse, 'rgba(255,217,77,0.4)');
      context.fillStyle = PALETTE.orb;
      context.beginPath();
      context.arc(orb.x, orb.y, orb.radius * pulse, 0, TAU);
      context.fill();
      context.fillStyle = PALETTE.orbCore;
      context.beginPath();
      context.arc(orb.x, orb.y, orb.radius * 0.45 * pulse, 0, TAU);
      context.fill();
    }
  }

  function drawShards(state) {
    for (let i = 0; i < state.shards.length; i += 1) {
      const shard = state.shards[i];
      if (!shard.active) continue;
      glowCircle(shard.x, shard.y, shard.radius * 1.8, 'rgba(138,43,226,0.35)');
      context.save();
      context.translate(shard.x, shard.y);
      context.rotate(shard.angle);
      context.beginPath();
      for (let p = 0; p < shard.points; p += 1) {
        const a = p / shard.points * TAU;
        const r = shard.radius * (p % 2 === 0 ? 1 : 0.62);
        if (p === 0) context.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else context.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      context.closePath();
      context.fillStyle = PALETTE.shard;
      context.fill();
      context.strokeStyle = PALETTE.shardEdge;
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    }
  }

  function drawPowerups(state) {
    for (let i = 0; i < state.powerups.length; i += 1) {
      const powerup = state.powerups[i];
      if (!powerup.active) continue;
      const color = powerup.kind === POWER_SHIELD ? PALETTE.shield
        : powerup.kind === POWER_MAGNET ? PALETTE.magnet : PALETTE.slow;
      const glow = powerup.kind === POWER_SHIELD ? 'rgba(77,201,255,0.4)'
        : powerup.kind === POWER_MAGNET ? 'rgba(124,252,154,0.4)' : 'rgba(201,167,255,0.4)';
      const pulse = 1 + 0.15 * Math.sin(powerup.pulse);
      glowCircle(powerup.x, powerup.y, powerup.radius * 2.4 * pulse, glow);
      context.save();
      context.translate(powerup.x, powerup.y);
      context.fillStyle = color;
      context.beginPath();
      context.arc(0, 0, powerup.radius * pulse, 0, TAU);
      context.fill();
      context.fillStyle = '#0a0d24';
      context.font = `bold ${Math.round(powerup.radius)}px ${FONT}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const glyph = powerup.kind === POWER_SHIELD ? 'S' : powerup.kind === POWER_MAGNET ? 'M' : 'T';
      context.fillText(glyph, 0, 1);
      context.restore();
    }
  }

  function drawParticles(state) {
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 30, PALETTE.text, 'left');
    text(waveLabel(state.wave), FIELD.width / 2, 18, 30, PALETTE.text, 'center');

    // Lives: small ship triangles, dimmed when lost.
    text('HULL', FIELD.width - 24 - LIVES * 34, 18, 30, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      const x = FIELD.width - 24 - (LIVES - 1 - life) * 34;
      const y = 30;
      context.save();
      context.translate(x, y);
      context.rotate(Math.PI / 2);
      context.fillStyle = life < state.lives ? PALETTE.ship : 'rgba(125,249,255,0.18)';
      context.beginPath();
      context.moveTo(11, 0);
      context.lineTo(-9, -8);
      context.lineTo(-4, 0);
      context.lineTo(-9, 8);
      context.closePath();
      context.fill();
      context.restore();
    }

    // Combo: a bar under the score, with the multiplier beside it.
    if (state.combo >= 2) {
      const barW = 150;
      const frac = Math.max(0, state.comboTimer / 2.5);
      context.fillStyle = 'rgba(255,217,77,0.25)';
      context.fillRect(24, 58, barW, 8);
      context.fillStyle = PALETTE.orb;
      context.fillRect(24, 58, barW * frac, 8);
      text(`COMBO x${state.mult}  (${state.combo})`, 24 + barW + 12, 52, 22, PALETTE.orb, 'left');
    }

    // Dash cooldown: a bar under the lives.
    const dashW = 110;
    const dashFrac = 1 - Math.max(0, state.ship.dashCooldown) / 2.2;
    context.fillStyle = 'rgba(125,249,255,0.22)';
    context.fillRect(FIELD.width - 24 - dashW, 58, dashW, 8);
    context.fillStyle = PALETTE.ship;
    context.fillRect(FIELD.width - 24 - dashW, 58, dashW * dashFrac, 8);
    text(dashFrac >= 1 ? 'DASH READY' : 'DASH', FIELD.width - 24 - dashW - 10, 52, 22, PALETTE.muted, 'right');

    // Active power-up timers, bottom-left.
    let slot = 0;
    if (state.ship.shield) {
      text('SHIELD', 24, FIELD.height - 40, 22, PALETTE.shield, 'left');
      slot += 1;
    }
    if (state.magnetTimer > 0) {
      text(`MAGNET ${state.magnetTimer.toFixed(0)}s`, 24 + slot * 150, FIELD.height - 40, 22, PALETTE.magnet, 'left');
      slot += 1;
    }
    if (state.slowTimer > 0) {
      text(`SLOW-TIME ${state.slowTimer.toFixed(0)}s`, 24 + slot * 150, FIELD.height - 40, 22, PALETTE.slow, 'left');
    }
    if (state.slowTimer > 0) {
      context.fillStyle = 'rgba(201,167,255,0.08)';
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.globalAlpha = 0.94;
    context.fillRect(x, y, PANEL.width, height);
    context.globalAlpha = 1;
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 52, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 24, PALETTE.orb, 'center');
  }

  const TITLE_LINES = [
    'The nebula is collapsing. Fly the light-ship,',
    'gather lumen orbs, dodge the void shards.',
    'Chain orbs into combos to multiply your score.',
    'Mouse steers  ·  WASD / arrows thrust  ·  Space / click dashes',
    'S = shield  ·  M = magnet  ·  T = slow-time  ·  P pauses',
    '',
  ];
  const PAUSED_LINES = ['The nebula waits for no one. Except now.'];
  const OVER_LINES = ['', '', '', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawBackground(state);
    drawOrbs(state);
    drawShards(state);
    drawPowerups(state);
    drawParticles(state);
    drawShip(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('LUMEN DRIFT', TITLE_LINES, 'Press Space or click to launch');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      OVER_LINES[2] = orbsLabel(state.collected);
      OVER_LINES[3] = comboLabel(state.bestCombo);
      drawPanel('The light fades', OVER_LINES, 'Press Space or click to drift again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Convert a point in canvas CSS pixels to playfield coordinates. */
    toField(cssX, cssY) {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const px = cssX * ratio;
      const py = cssY * ratio;
      return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
    },
  };
}
