export enum AIMode {
  DIRECT = 0,       // Default chase with phase-based offset near player
  SWARM = 1,        // Tighter grouping with smaller phase offset
  BEELINE = 2,      // Direct beeline to player (force_target)
  FORMATION = 3,    // Follow linked creature with offset
  LINKED_CHASE = 4, // Chase player but die if link dies
  LINKED_STOP = 5,  // Follow link with slowdown near target, die if link dies
  ORBIT = 6,        // Orbit around linked creature
  HOLD = 7,         // Stop in place (timer-based or orbit_radius countdown)
  RUSH = 8          // Rush mode phase offset (0.9 multiplier)
}

export enum CreatureFlags {
  NONE = 0,
  SELF_DAMAGE_TICK = 0x01,
  SELF_DAMAGE_TICK_STRONG = 0x02,
  ANIM_PING_PONG = 0x04,
  HAS_SPAWN_SLOT = 0x04,
  SPLIT_ON_DEATH = 0x08,
  RANGED_ATTACK_SHOCK = 0x10,
  ANIM_LONG_STRIP = 0x40,
  AI7_LINK_TIMER = 0x80,
  RANGED_ATTACK_VARIANT = 0x100,
  BONUS_ON_DEATH = 0x400
}

export interface CreatureAIState {
  x: number;
  y: number;
  hp: number;
  flags: CreatureFlags;
  aiMode: AIMode;
  linkIndex: number;
  targetOffsetX: number | null;
  targetOffsetY: number | null;
  phaseSeed: number;
  orbitAngle: number;
  orbitRadius: number;
  heading: number;
  targetX: number;
  targetY: number;
  targetHeading: number;
  forceTarget: number;
  moveScale: number;
}

export interface CreatureLink {
  x: number;
  y: number;
  hp: number;
  active: boolean;
}

export interface AIUpdateResult {
  moveScale: number;
  selfDamage: number | null;
}

export function tickAI7LinkTimer(
  creature: CreatureAIState,
  dtMs: number,
  rand: () => number
): void {
  if (!(creature.flags & CreatureFlags.AI7_LINK_TIMER)) {
    return;
  }

  if (creature.linkIndex < 0) {
    creature.linkIndex += dtMs;
    if (creature.linkIndex >= 0) {
      creature.aiMode = AIMode.HOLD;
      creature.linkIndex = (rand() & 0x1FF) + 500;
    }
    return;
  }

  creature.linkIndex -= dtMs;
  if (creature.linkIndex < 1) {
    creature.linkIndex = -700 - (rand() & 0x3FF);
  }
}

export function resolveLiveLink(
  creatures: CreatureLink[],
  linkIndex: number
): CreatureLink | null {
  if (linkIndex >= 0 && linkIndex < creatures.length && creatures[linkIndex].hp > 0 && creatures[linkIndex].active) {
    return creatures[linkIndex];
  }
  return null;
}

export function updateCreatureAITarget(
  creature: CreatureAIState,
  playerX: number,
  playerY: number,
  creatures: CreatureLink[],
  dt: number
): AIUpdateResult {
  const dx = playerX - creature.x;
  const dy = playerY - creature.y;
  const distToPlayer = Math.hypot(dx, dy);

  const orbitPhase = Math.floor(creature.phaseSeed) * 3.7 * Math.PI;
  let moveScale = 1.0;
  let selfDamage: number | null = null;

  creature.forceTarget = 0;

  const aiMode = creature.aiMode;

  switch (aiMode) {
    case AIMode.DIRECT:
      if (distToPlayer > 800.0) {
        creature.targetX = playerX;
        creature.targetY = playerY;
      } else {
        creature.targetX = playerX + Math.cos(orbitPhase) * distToPlayer * 0.85;
        creature.targetY = playerY + Math.sin(orbitPhase) * distToPlayer * 0.85;
      }
      break;

    case AIMode.RUSH:
      creature.targetX = playerX + Math.cos(orbitPhase) * distToPlayer * 0.9;
      creature.targetY = playerY + Math.sin(orbitPhase) * distToPlayer * 0.9;
      break;

    case AIMode.SWARM:
      if (distToPlayer > 800.0) {
        creature.targetX = playerX;
        creature.targetY = playerY;
      } else {
        creature.targetX = playerX + Math.cos(orbitPhase) * distToPlayer * 0.55;
        creature.targetY = playerY + Math.sin(orbitPhase) * distToPlayer * 0.55;
      }
      break;

    case AIMode.FORMATION: {
      const link = resolveLiveLink(creatures, creature.linkIndex);
      if (link !== null) {
        creature.targetX = link.x + (creature.targetOffsetX || 0.0);
        creature.targetY = link.y + (creature.targetOffsetY || 0.0);
      } else {
        creature.aiMode = AIMode.DIRECT;
      }
      break;
    }

    case AIMode.LINKED_STOP: {
      const link = resolveLiveLink(creatures, creature.linkIndex);
      if (link !== null) {
        creature.targetX = link.x + (creature.targetOffsetX || 0.0);
        creature.targetY = link.y + (creature.targetOffsetY || 0.0);
        const distToTarget = Math.hypot(creature.targetX - creature.x, creature.targetY - creature.y);
        if (distToTarget <= 64.0) {
          moveScale = distToTarget * 0.015625;
        }
      } else {
        creature.aiMode = AIMode.DIRECT;
        selfDamage = 1000.0;
      }
      break;
    }

    case AIMode.LINKED_CHASE: {
      const link = resolveLiveLink(creatures, creature.linkIndex);
      if (link === null) {
        creature.aiMode = AIMode.DIRECT;
        selfDamage = 1000.0;
      } else if (distToPlayer > 800.0) {
        creature.targetX = playerX;
        creature.targetY = playerY;
      } else {
        creature.targetX = playerX + Math.cos(orbitPhase) * distToPlayer * 0.85;
        creature.targetY = playerY + Math.sin(orbitPhase) * distToPlayer * 0.85;
      }
      break;
    }

    case AIMode.HOLD:
      if ((creature.flags & CreatureFlags.AI7_LINK_TIMER) && creature.linkIndex > 0) {
        creature.targetX = creature.x;
        creature.targetY = creature.y;
      } else if (!(creature.flags & CreatureFlags.AI7_LINK_TIMER) && creature.orbitRadius > 0.0) {
        creature.targetX = creature.x;
        creature.targetY = creature.y;
        creature.orbitRadius -= dt;
      } else {
        creature.aiMode = AIMode.DIRECT;
      }
      break;

    case AIMode.ORBIT: {
      const link = resolveLiveLink(creatures, creature.linkIndex);
      if (link === null) {
        creature.aiMode = AIMode.DIRECT;
      } else {
        const angle = creature.orbitAngle + creature.heading;
        creature.targetX = link.x + Math.cos(angle) * creature.orbitRadius;
        creature.targetY = link.y + Math.sin(angle) * creature.orbitRadius;
      }
      break;
    }
  }

  const distToTarget = Math.hypot(creature.targetX - creature.x, creature.targetY - creature.y);
  if (distToTarget < 40.0 || distToTarget > 400.0) {
    creature.forceTarget = 1;
  }

  if (creature.forceTarget || creature.aiMode === AIMode.BEELINE) {
    creature.targetX = playerX;
    creature.targetY = playerY;
  }

  creature.targetHeading = Math.atan2(creature.targetY - creature.y, creature.targetX - creature.x) + Math.PI / 2.0;

  return { moveScale, selfDamage };
}

export function wrapAngle(angle: number): number {
  return ((angle + Math.PI) % (Math.PI * 2)) - Math.PI;
}

export function angleApproach(current: number, target: number, rate: number, dt: number): number {
  const delta = wrapAngle(target - current);
  const stepScale = Math.min(1.0, Math.abs(delta));
  const step = dt * stepScale * rate;
  if (delta >= 0.0) {
    return wrapAngle(current + step);
  } else {
    return wrapAngle(current - step);
  }
}

export const CREATURE_SPEED_SCALE = 30.0;
export const CREATURE_TURN_RATE_SCALE = 4.0 / 3.0;

export interface FormationChildSpec {
  offsetX: number;
  offsetY: number;
  orbitAngle?: number;
  orbitRadius?: number;
}

export function generateRingFormation(count: number, radius: number): FormationChildSpec[] {
  const children: FormationChildSpec[] = [];
  const angleStep = (Math.PI * 2) / count;

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep;
    children.push({
      offsetX: Math.cos(angle) * radius,
      offsetY: Math.sin(angle) * radius
    });
  }

  return children;
}

export function generateChainFormation(
  count: number,
  spacing: number,
  curveRadius: number
): FormationChildSpec[] {
  const children: FormationChildSpec[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (2 + i * 2) * (Math.PI / 8.0);
    children.push({
      offsetX: -256.0 + i * spacing,
      offsetY: -256.0,
      orbitAngle: Math.PI,
      orbitRadius: 10.0
    });
  }

  return children;
}

export function generateGridFormation(
  xRange: number[],
  yRange: number[],
  xStep: number,
  yStep: number
): FormationChildSpec[] {
  const children: FormationChildSpec[] = [];

  for (let x = xRange[0]; x !== xRange[1]; x += xStep) {
    for (let y = yRange[0]; y !== yRange[1]; y += yStep) {
      children.push({
        offsetX: x,
        offsetY: y
      });
    }
  }

  return children;
}

export interface TintRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function tintToHex(tint: TintRGBA): number {
  const r = Math.floor(Math.min(255, Math.max(0, tint.r * 255)));
  const g = Math.floor(Math.min(255, Math.max(0, tint.g * 255)));
  const b = Math.floor(Math.min(255, Math.max(0, tint.b * 255)));
  return (r << 16) | (g << 8) | b;
}

export function randomTintVariant(
  base: TintRGBA,
  rand: () => number,
  variance: number = 0.1
): TintRGBA {
  const v = () => ((rand() % 100) / 100 - 0.5) * 2 * variance;
  return {
    r: Math.min(1, Math.max(0, base.r + v())),
    g: Math.min(1, Math.max(0, base.g + v())),
    b: Math.min(1, Math.max(0, base.b + v())),
    a: base.a
  };
}

export function experienceBasedTint(playerXp: number, rand: () => number): TintRGBA {
  let r: number, g: number, b: number;
  const a = 1.0;

  if (playerXp < 50000) {
    r = 1.0 - 1.0 / (Math.floor(playerXp / 1000) + 10.0);
    g = (rand() % 10) * 0.01 + 0.9 - 1.0 / (Math.floor(playerXp / 10000) + 10.0);
    b = (rand() % 10) * 0.01 + 0.7;
  } else if (playerXp < 100000) {
    r = 0.9 - 1.0 / (Math.floor(playerXp / 1000) + 10.0);
    g = (rand() % 10) * 0.01 + 0.8 - 1.0 / (Math.floor(playerXp / 10000) + 10.0);
    b = (playerXp - 50000) * 6e-06 + (rand() % 10) * 0.01 + 0.7;
  } else {
    r = 1.0 - 1.0 / (Math.floor(playerXp / 1000) + 10.0);
    g = (rand() % 10) * 0.01 + 0.9 - 1.0 / (Math.floor(playerXp / 10000) + 10.0);
    b = (rand() % 10) * 0.01 + 1.0 - (playerXp - 100000) * 3e-06;
    if (b < 0.5) b = 0.5;
  }

  return {
    r: Math.min(1, Math.max(0, r)),
    g: Math.min(1, Math.max(0, g)),
    b: Math.min(1, Math.max(0, b)),
    a
  };
}

export const VARIANT_TINTS = {
  RED_ELITE: { r: 0.9, g: 0.4, b: 0.4, a: 1.0 },
  GREEN_ELITE: { r: 0.4, g: 0.9, b: 0.4, a: 1.0 },
  BLUE_ELITE: { r: 0.4, g: 0.4, b: 0.9, a: 1.0 },
  PURPLE_RARE: { r: 0.84, g: 0.24, b: 0.89, a: 1.0 },
  GOLD_BOSS: { r: 0.94, g: 0.84, b: 0.29, a: 1.0 },
  GHOST: { r: 0.7, g: 0.1, b: 0.51, a: 0.5 },
  GHOST_GREEN: { r: 0.1, g: 0.7, b: 0.51, a: 0.05 },
  BRONZE: { r: 0.7125, g: 0.4125, b: 0.2775, a: 0.6 },
  CYAN: { r: 0.0, g: 0.9, b: 0.8, a: 1.0 },
  ORANGE: { r: 1.0, g: 0.75, b: 0.1, a: 1.0 }
};

export function rollVariantStats(
  baseHealth: number,
  baseReward: number,
  rand: () => number
): { health: number; reward: number; tint: TintRGBA | null } {
  let r = rand();
  if (r % 180 < 2) {
    return { health: 65.0, reward: 320.0, tint: VARIANT_TINTS.RED_ELITE };
  }

  r = rand();
  if (r % 240 < 2) {
    return { health: 85.0, reward: 420.0, tint: VARIANT_TINTS.GREEN_ELITE };
  }

  r = rand();
  if (r % 360 < 2) {
    return { health: 125.0, reward: 520.0, tint: VARIANT_TINTS.BLUE_ELITE };
  }

  r = rand();
  if (r % 1320 < 4) {
    return { health: baseHealth + 230.0, reward: 600.0, tint: VARIANT_TINTS.PURPLE_RARE };
  }

  r = rand();
  if (r % 1620 < 4) {
    return { health: baseHealth + 2230.0, reward: 900.0, tint: VARIANT_TINTS.GOLD_BOSS };
  }

  return { health: baseHealth, reward: baseReward, tint: null };
}
