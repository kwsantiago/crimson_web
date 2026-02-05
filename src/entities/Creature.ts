import Phaser from "phaser";
import { Player } from "./Player";
import {
  CreatureType,
  CreatureData,
  getCreatureData,
  CREATURES,
} from "../data/creatures";
import {
  AIMode,
  CreatureFlags,
  CreatureAIState,
  CreatureLink,
  updateCreatureAITarget,
  tickAI7LinkTimer,
  angleApproach,
  wrapAngle,
  TintRGBA,
  tintToHex,
  CREATURE_SPEED_SCALE,
  CREATURE_TURN_RATE_SCALE,
} from "../systems/CreatureAI";

export interface CreatureConfig {
  aiMode?: AIMode;
  flags?: CreatureFlags;
  linkIndex?: number;
  targetOffsetX?: number;
  targetOffsetY?: number;
  orbitAngle?: number;
  orbitRadius?: number;
  phaseSeed?: number;
  tint?: TintRGBA;
  sizeOverride?: number;
  healthOverride?: number;
  speedOverride?: number;
  damageOverride?: number;
  xpOverride?: number;
  rangedProjectileType?: number;
  spawnTimerOverride?: number;
  spawnTypeOverride?: CreatureType;
}

let creaturePool: Creature[] = [];

export function getCreaturePool(): Creature[] {
  return creaturePool;
}

export function registerCreature(creature: Creature): number {
  const index = creaturePool.length;
  creaturePool.push(creature);
  return index;
}

export function clearCreaturePool(): void {
  creaturePool = [];
}

export class Creature extends Phaser.Physics.Arcade.Sprite {
  creatureType: CreatureType;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  xpValue: number;
  isRanged: boolean;
  spawnsOnDeath?: CreatureType;
  spawnCount: number;
  isStationary: boolean = false;
  spawnTimer: number = 0;
  spawnInterval: number = 0;
  spawnType?: CreatureType;
  spawnCount_limit: number = 100;
  spawnCount_current: number = 0;
  freezeTimer: number = 0;
  poisonTimer: number = 0;
  fleeTimer: number = 0;

  poolIndex: number = -1;
  aiMode: AIMode = AIMode.DIRECT;
  flags: CreatureFlags = CreatureFlags.NONE;
  linkIndex: number = 0;
  targetOffsetX: number | null = null;
  targetOffsetY: number | null = null;
  phaseSeed: number = 0;
  orbitAngle: number = 0;
  orbitRadius: number = 0;
  heading: number = 0;
  targetX: number = 0;
  targetY: number = 0;
  targetHeading: number = 0;
  forceTarget: number = 0;
  moveScale: number = 1.0;
  rangedProjectileType: number = 0;
  customTint: TintRGBA | null = null;
  splitSize: number = 0;

  private collisionTimer: number = 0.5;
  private readonly CONTACT_DAMAGE_PERIOD: number = 0.5;
  private rangedAttackCooldown: number = 0;
  private projectileCooldown: number = 0;
  private projectileRate: number = 2.0;
  private projectiles?: Phaser.Physics.Arcade.Group;
  private poisonDamageTimer: number = 0;
  private poisonDps: number = 6;
  private freezePulseTimer: number = 0;
  private isDying: boolean = false;
  private inContactThisFrame: boolean = false;
  private shadow: Phaser.GameObjects.Sprite;
  private animPhase: number = 0;
  private readonly SHADOW_SCALE = 1.07;
  private readonly SHADOW_ALPHA = 0.4;
  private readonly SHADOW_OFFSET = 3;
  private readonly ANIM_RATE = 8;

  private dropBonus: { bonusType: number; weaponId?: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: CreatureType = CreatureType.ZOMBIE,
    projectiles?: Phaser.Physics.Arcade.Group,
    config?: CreatureConfig,
  ) {
    const data = getCreatureData(type);
    const sheetMap: Record<string, string> = {
      zombie: "zombie_sheet",
      fast_zombie: "zombie_sheet",
      big_zombie: "zombie_sheet",
      spider: "spider_sp1_sheet",
      baby_spider: "spider_sp1_sheet",
      spider_mother: "spider_sp2_sheet",
      alien: "alien_sheet",
      alien_elite: "alien_sheet",
      alien_boss: "alien_sheet",
      lizard: "lizard_sheet",
      lizard_spitter: "lizard_sheet",
      nest: "nest",
      boss: "zombie_sheet",
    };
    const sheetKey = sheetMap[type] || type;
    super(scene, x, y, sheetKey, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.creatureType = type;
    this.projectiles = projectiles;

    this.shadow = scene.add.sprite(
      x + this.SHADOW_OFFSET,
      y + this.SHADOW_OFFSET,
      sheetKey,
      0,
    );
    this.shadow.setTint(0x000000);
    this.shadow.setAlpha(this.SHADOW_ALPHA);
    this.shadow.setDepth(4);
    this.setDepth(5);

    const sizeScale = config?.sizeOverride ? config.sizeOverride / 50 : 1;
    this.setScale(data.scale * sizeScale);
    this.shadow.setScale(data.scale * sizeScale * this.SHADOW_SCALE);
    const scaledCenter = 32 * data.scale * sizeScale;
    const radius = data.radius * sizeScale;
    this.setCircle(radius, scaledCenter - radius, scaledCenter - radius);

    this.health = config?.healthOverride ?? data.health;
    this.maxHealth = this.health;
    this.speed = config?.speedOverride ?? data.speed;
    this.damage = config?.damageOverride ?? data.damage;
    this.xpValue = config?.xpOverride ?? data.xp;
    this.isRanged = data.isRanged;
    this.spawnsOnDeath = data.spawnsOnDeath;
    this.spawnCount = data.spawnCount || 0;
    this.splitSize = config?.sizeOverride ?? 50;
    this.isStationary = data.isStationary ?? false;
    this.spawnType = config?.spawnTypeOverride ?? data.spawnType;
    this.spawnInterval = config?.spawnTimerOverride ?? data.spawnTimer ?? 0;
    this.spawnTimer = this.spawnInterval;

    if (data.projectileCooldown) {
      this.projectileRate = data.projectileCooldown;
    }

    this.poolIndex = registerCreature(this);

    if (config) {
      this.aiMode = config.aiMode ?? AIMode.DIRECT;
      this.flags = config.flags ?? CreatureFlags.NONE;
      this.linkIndex = config.linkIndex ?? 0;
      this.targetOffsetX = config.targetOffsetX ?? null;
      this.targetOffsetY = config.targetOffsetY ?? null;
      this.orbitAngle = config.orbitAngle ?? 0;
      this.orbitRadius = config.orbitRadius ?? 0;
      this.rangedProjectileType = config.rangedProjectileType ?? 0;

      if (config.tint) {
        this.customTint = config.tint;
        const tintHex = tintToHex(config.tint);
        this.setTint(tintHex);
        this.setAlpha(config.tint.a);
      }
    }

    this.phaseSeed = config?.phaseSeed ?? Math.random() * 0x17f;
    this.heading = Math.random() * Math.PI * 2;
    this.targetX = x;
    this.targetY = y;
    this.targetHeading = this.heading;

    if (this.flags & CreatureFlags.SPLIT_ON_DEATH) {
      this.spawnsOnDeath = undefined;
    }
  }

  getAIState(): CreatureAIState {
    return {
      x: this.x,
      y: this.y,
      hp: this.health,
      flags: this.flags,
      aiMode: this.aiMode,
      linkIndex: this.linkIndex,
      targetOffsetX: this.targetOffsetX,
      targetOffsetY: this.targetOffsetY,
      phaseSeed: this.phaseSeed,
      orbitAngle: this.orbitAngle,
      orbitRadius: this.orbitRadius,
      heading: this.heading,
      targetX: this.targetX,
      targetY: this.targetY,
      targetHeading: this.targetHeading,
      forceTarget: this.forceTarget,
      moveScale: this.moveScale,
    };
  }

  applyAIState(state: CreatureAIState): void {
    this.aiMode = state.aiMode;
    this.linkIndex = state.linkIndex;
    this.targetX = state.targetX;
    this.targetY = state.targetY;
    this.targetHeading = state.targetHeading;
    this.forceTarget = state.forceTarget;
    this.moveScale = state.moveScale;
    this.orbitRadius = state.orbitRadius;
  }

  update(delta: number, player: Player) {
    if (this.health <= 0 || !this.active || this.isDying) return;

    const dt = delta / 1000;
    const dtMs = delta;
    this.rangedAttackCooldown = Math.max(0, this.rangedAttackCooldown - dt);

    this.shadow.setPosition(
      this.x + this.SHADOW_OFFSET,
      this.y + this.SHADOW_OFFSET,
    );
    this.shadow.setRotation(this.rotation);
    this.shadow.setFrame(this.frame.name);

    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      this.setVelocity(0, 0);
      this.freezePulseTimer += dt;
      const pulse = 0.95 + Math.sin(this.freezePulseTimer * 8) * 0.05;
      const baseScale =
        getCreatureData(this.creatureType).scale * (this.splitSize / 50);
      this.setScale(pulse * baseScale);
      this.shadow.setScale(pulse * baseScale * this.SHADOW_SCALE);
      this.setTint(0x66ddff);
      return;
    } else {
      if (this.freezePulseTimer > 0) {
        this.freezePulseTimer = 0;
        const baseScale =
          getCreatureData(this.creatureType).scale * (this.splitSize / 50);
        this.setScale(baseScale);
        this.shadow.setScale(baseScale * this.SHADOW_SCALE);
      }
      if (this.customTint) {
        this.setTint(tintToHex(this.customTint));
      } else {
        this.clearTint();
      }
    }

    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.poisonDamageTimer += dt;

      const poisonDamage = dt * this.poisonDps;
      this.health -= poisonDamage;

      if (this.poisonDamageTimer >= 0.2) {
        this.poisonDamageTimer = 0;
        this.setTint(0x00ff00);
        this.scene.time.delayedCall(100, () => {
          if (this.active && this.freezeTimer <= 0) {
            if (this.customTint) {
              this.setTint(tintToHex(this.customTint));
            } else {
              this.clearTint();
            }
          }
        });
      }

      if (this.health <= 0) {
        this.die();
        return;
      }
    }

    if (this.flags & CreatureFlags.SELF_DAMAGE_TICK_STRONG) {
      this.health -= dt * 180.0;
      if (this.health <= 0) {
        this.die();
        return;
      }
    } else if (this.flags & CreatureFlags.SELF_DAMAGE_TICK) {
      this.health -= dt * 60.0;
      if (this.health <= 0) {
        this.die();
        return;
      }
    }

    if (this.fleeTimer > 0) {
      this.fleeTimer -= dt;
      this.setTint(0xffff00);
    } else if (
      this.fleeTimer <= 0 &&
      this.poisonTimer <= 0 &&
      this.freezeTimer <= 0
    ) {
      if (this.customTint) {
        this.setTint(tintToHex(this.customTint));
      } else {
        this.clearTint();
      }
    }

    const creatures: CreatureLink[] = creaturePool.map((c) => ({
      x: c.x,
      y: c.y,
      hp: c.health,
      active: c.active && !c.isDying,
    }));

    const rand = () => Math.floor(Math.random() * 0x7fffffff);

    const aiState = this.getAIState();

    tickAI7LinkTimer(aiState, dtMs, rand);

    const result = updateCreatureAITarget(
      aiState,
      player.x,
      player.y,
      creatures,
      dt,
    );

    this.applyAIState(aiState);
    this.moveScale = result.moveScale;

    if (result.selfDamage !== null && result.selfDamage > 0) {
      this.health -= result.selfDamage;
      if (this.health <= 0) {
        this.die();
        return;
      }
    }

    const isFleeing = this.fleeTimer > 0;

    if (isFleeing) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        const fleeSpeed = this.speed * 1.5;
        this.setVelocity((-dx / dist) * fleeSpeed, (-dy / dist) * fleeSpeed);
        const heading = Math.atan2(-dy, -dx);
        this.setRotation(heading + Math.PI);
        this.animPhase += dt * this.ANIM_RATE * (fleeSpeed / 100);
      }
    } else if (this.aiMode === AIMode.HOLD || this.isStationary) {
      this.setVelocity(0, 0);
    } else {
      const turnRate =
        (this.speed / CREATURE_SPEED_SCALE) * CREATURE_TURN_RATE_SCALE;
      this.heading = angleApproach(
        this.heading,
        this.targetHeading,
        turnRate,
        dt,
      );

      const speed = this.speed * this.moveScale;

      const dirX = Math.cos(this.heading - Math.PI / 2.0);
      const dirY = Math.sin(this.heading - Math.PI / 2.0);

      this.setVelocity(dirX * speed, dirY * speed);
      this.setRotation(this.heading - Math.PI / 2.0);

      if (speed > 0) {
        this.animPhase += dt * this.ANIM_RATE * (speed / 100);
      }
    }

    if (this.isRanged && !isFleeing) {
      this.projectileCooldown -= dt;
      const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

      if (
        distToPlayer > 64 &&
        this.projectileCooldown <= 0 &&
        this.projectiles
      ) {
        this.fireProjectile(player);
        this.projectileCooldown = this.projectileRate;
      }
    }

    if (
      this.flags &
        (CreatureFlags.RANGED_ATTACK_SHOCK |
          CreatureFlags.RANGED_ATTACK_VARIANT) &&
      !isFleeing
    ) {
      if (this.rangedAttackCooldown > 0) {
        this.rangedAttackCooldown -= dt;
      }

      const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
      if (distToPlayer > 64 && this.rangedAttackCooldown <= 0) {
        if (this.flags & CreatureFlags.RANGED_ATTACK_SHOCK) {
          this.fireShockProjectile();
          this.rangedAttackCooldown += 1.0;
        }

        if (
          this.flags & CreatureFlags.RANGED_ATTACK_VARIANT &&
          this.rangedAttackCooldown <= 0
        ) {
          this.fireVariantProjectile();
          const randDelay = Math.floor(Math.random() * 4) * 0.1;
          this.rangedAttackCooldown =
            this.orbitAngle + randDelay + this.rangedAttackCooldown;
        }
      }
    }

    const frameCount = 16;
    const frame = Math.floor(this.animPhase) % frameCount;
    this.setFrame(frame);
  }

  tickSpawnSlot(dt: number): CreatureType | null {
    if (!this.spawnType || this.spawnInterval <= 0) return null;
    if (this.spawnCount_current >= this.spawnCount_limit) return null;

    this.spawnTimer -= dt;
    if (this.spawnTimer < 0) {
      this.spawnTimer += this.spawnInterval;
      this.spawnCount_current++;
      return this.spawnType;
    }
    return null;
  }

  private fireProjectile(player: Player) {
    if (!this.projectiles) return;

    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const bullet = this.projectiles.get(this.x, this.y, "alien_projectile");
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setRotation(angle);
      bullet.damage = 8;
      bullet.isEnemyProjectile = true;
      const body = bullet.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.enable = true;
        body.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
      }
    }
  }

  private fireShockProjectile() {
    if (!this.projectiles) return;

    const angle = this.heading;
    const bullet = this.projectiles.get(this.x, this.y, "alien_projectile");
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setRotation(angle);
      bullet.damage = 45;
      bullet.isEnemyProjectile = true;
      bullet.setTint(0x00ffff);
      const body = bullet.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.enable = true;
        body.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
      }
    }
  }

  private fireVariantProjectile() {
    if (!this.projectiles) return;

    const angle = this.heading;
    const bullet = this.projectiles.get(this.x, this.y, "alien_projectile");
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setRotation(angle);
      bullet.damage = 45;
      bullet.isEnemyProjectile = true;
      bullet.setTint(0xff8800);
      const body = bullet.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.enable = true;
        body.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);
      }
    }
  }

  tickContactDamage(dt: number, inContact: boolean): boolean {
    if (!inContact) {
      return false;
    }

    this.collisionTimer -= dt;
    if (this.collisionTimer >= 0) {
      return false;
    }

    this.collisionTimer += this.CONTACT_DAMAGE_PERIOD;
    return this.damage > 0;
  }

  getContactDamage(): number {
    return this.damage;
  }

  setInContactThisFrame(value: boolean) {
    this.inContactThisFrame = value;
  }

  wasInContactThisFrame(): boolean {
    return this.inContactThisFrame;
  }

  applyContactPoison(strong: boolean) {
    const duration = strong ? 2.0 : 3.0;
    const dps = strong ? 180 : 60;
    this.poisonTimer = duration;
    this.poisonDamageTimer = 0;
    this.poisonDps = dps;
  }

  takeDamage(amount: number, applyPoison: boolean = false): boolean {
    this.health -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active && this.freezeTimer <= 0) {
        if (this.customTint) {
          this.setTint(tintToHex(this.customTint));
        } else {
          this.clearTint();
        }
      }
    });

    if (applyPoison && this.poisonTimer <= 0) {
      this.poisonTimer = 3.0;
      this.poisonDamageTimer = 0;
    }

    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  freeze(duration: number) {
    this.freezeTimer = duration;
    this.setVelocity(0, 0);
  }

  flee(duration: number) {
    this.fleeTimer = duration;
  }

  applyPlague(damagePerTick: number) {
    if (this.poisonTimer <= 0) {
      this.poisonTimer = 5.0;
      this.poisonDamageTimer = 0;
      this.poisonDps = damagePerTick * 2;
    }
  }

  isFleeing(): boolean {
    return this.fleeTimer > 0;
  }

  setDropBonus(bonusType: number, weaponId?: number): void {
    this.dropBonus = { bonusType, weaponId };
  }

  hasDropBonus(): boolean {
    return this.dropBonus !== null;
  }

  getDropBonus(): { bonusType: number; weaponId?: number } | null {
    return this.dropBonus;
  }

  shouldSplitOnDeath(): boolean {
    return (
      (this.flags & CreatureFlags.SPLIT_ON_DEATH) !== 0 && this.splitSize > 35
    );
  }

  getSplitChildren(): {
    health: number;
    size: number;
    speed: number;
    damage: number;
    xp: number;
    heading: number;
  }[] {
    if (!this.shouldSplitOnDeath()) return [];

    const children = [];
    for (const headingOffset of [-Math.PI / 2.0, Math.PI / 2.0]) {
      children.push({
        health: this.maxHealth * 0.25,
        size: this.splitSize - 8.0,
        speed: this.speed + 0.1,
        damage: this.damage * 0.7,
        xp: Math.floor((this.xpValue * 2) / 3),
        heading: wrapAngle(this.heading + headingOffset),
      });
    }
    return children;
  }

  private die() {
    if (this.isDying) return;
    this.isDying = true;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
    }
    this.setVelocity(0, 0);

    this.setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (!this.active) return;
      if (this.customTint) {
        this.setTint(tintToHex(this.customTint));
      } else {
        this.clearTint();
      }

      this.scene.tweens.add({
        targets: [this, this.shadow],
        alpha: 0,
        scaleX: this.scaleX * 0.5,
        scaleY: this.scaleY * 0.5,
        duration: 250,
        ease: "Power2",
        onComplete: () => {
          this.setActive(false);
          this.setVisible(false);
          this.shadow.destroy();
        },
      });
    });
  }
}
