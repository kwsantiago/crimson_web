import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Creature } from '../entities/Creature';
import { Projectile } from '../entities/Projectile';
import { Bonus } from '../entities/Bonus';
import { SpawnManager } from '../systems/SpawnManager';
import { BonusManager } from '../systems/BonusManager';
import { PerkSelector } from '../ui/PerkSelector';
import { HighScoreManager } from '../systems/HighScoreManager';
import { GameMode, GAME_MODE_CONFIGS } from '../data/gameModes';
import { CreatureType } from '../data/creatures';
import { PerkId } from '../data/perks';
import { ProjectileType, WEAPONS } from '../data/weapons';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  getXpForLevel
} from '../config';

interface GameSceneData {
  gameMode?: GameMode;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private creatures!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private bonuses!: Phaser.Physics.Arcade.Group;
  private spawnManager!: SpawnManager;
  private bonusManager!: BonusManager;
  private perkSelector!: PerkSelector;
  private highScoreManager!: HighScoreManager;
  private bloodDecals!: Phaser.GameObjects.Group;
  private healthBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private killCount: number = 0;
  private killText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private reloadText!: Phaser.GameObjects.Text;
  private perkPromptText!: Phaser.GameObjects.Text;
  private powerupIcons!: Phaser.GameObjects.Container;
  private gameOver: boolean = false;
  private hitSparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private maxBloodDecals: number = 100;
  private pendingPerks: number = 0;
  private perkKey!: Phaser.Input.Keyboard.Key;
  private gameStartTime: number = 0;
  private explosionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private gameMode: GameMode = GameMode.SURVIVAL;
  private modeIndicator!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  init(data: GameSceneData) {
    this.gameMode = data.gameMode || GameMode.SURVIVAL;
  }

  create() {
    this.gameOver = false;
    this.killCount = 0;
    this.pendingPerks = 0;
    this.gameStartTime = Date.now();

    this.highScoreManager = new HighScoreManager();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createBackground();
    this.createParticleSystems();

    this.bloodDecals = this.add.group();

    this.projectiles = this.physics.add.group({
      classType: Projectile,
      maxSize: 500,
      runChildUpdate: true
    });

    this.enemyProjectiles = this.physics.add.group({
      maxSize: 100,
      runChildUpdate: true
    });

    this.creatures = this.physics.add.group({
      classType: Creature,
      runChildUpdate: false
    });

    this.bonuses = this.physics.add.group({
      classType: Bonus,
      runChildUpdate: false
    });

    this.player = new Player(
      this,
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      this.projectiles
    );

    this.player.perkManager.setCallbacks({
      onXpGain: (amount) => this.player.addXp(amount),
      onWeaponChange: (index) => this.player.weaponManager.switchWeapon(index),
      onHeal: (amount) => this.player.heal(amount),
      onFreezeEnemies: (duration) => this.freezeAllEnemies(duration),
      onKillHalfEnemies: () => this.killHalfEnemies(),
      onLoseHalfHealth: () => this.player.takeDamage(this.player.health / 2),
      onInstantDeath: () => this.player.takeDamage(9999),
      onAddPendingPerks: (count) => { this.pendingPerks += count; },
      onSetHealth: (health) => { this.player.health = health; },
      onReduceMaxHealth: (mult) => { this.player.maxHealth *= mult; }
    });

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.spawnManager = new SpawnManager(this, this.creatures, this.enemyProjectiles, this.gameMode);
    this.bonusManager = new BonusManager(this, this.bonuses, this.player);
    this.bonusManager.setCallbacks({
      onNuke: () => this.nukeAllEnemies(),
      onFreeze: (duration) => this.freezeAllEnemies(duration)
    });

    this.perkSelector = new PerkSelector(this, this.player.perkManager);
    this.perkSelector.setCallback((perkId) => {
      this.pendingPerks--;
      if (this.pendingPerks > 0) {
        this.time.delayedCall(100, () => this.perkSelector.show());
      }
    });

    this.perkKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.setupCollisions();
    this.createHUD();
  }

  private setupCollisions() {
    this.physics.add.overlap(
      this.projectiles,
      this.creatures,
      this.onBulletHitCreature as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.creatures,
      this.onPlayerHitCreature as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.enemyProjectiles,
      this.player,
      this.onEnemyBulletHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.bonuses,
      this.onPlayerPickupBonus as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  private createBackground() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x2d3436, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    graphics.lineStyle(1, 0x636e72, 0.3);
    const gridSize = 64;
    for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, WORLD_HEIGHT);
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(WORLD_WIDTH, y);
    }
    graphics.strokePath();
  }

  private createParticleSystems() {
    this.hitSparkEmitter = this.add.particles(0, 0, 'hit_spark', {
      speed: { min: 50, max: 150 },
      scale: { start: 1, end: 0 },
      lifespan: 200,
      quantity: 5,
      emitting: false
    });
    this.hitSparkEmitter.setDepth(15);

    this.bloodEmitter = this.add.particles(0, 0, 'blood_particle', {
      speed: { min: 30, max: 100 },
      scale: { start: 1, end: 0.3 },
      lifespan: 400,
      quantity: 8,
      emitting: false
    });
    this.bloodEmitter.setDepth(15);

    this.explosionEmitter = this.add.particles(0, 0, 'explosion', {
      speed: { min: 20, max: 80 },
      scale: { start: 1, end: 0 },
      lifespan: 500,
      quantity: 1,
      emitting: false
    });
    this.explosionEmitter.setDepth(16);
  }

  private createHUD() {
    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(100);

    this.xpBar = this.add.graphics();
    this.xpBar.setScrollFactor(0);
    this.xpBar.setDepth(100);

    this.levelText = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT - 45, 'Level 1', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.killText = this.add.text(SCREEN_WIDTH - 16, 16, 'Kills: 0', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    const modeConfig = GAME_MODE_CONFIGS[this.gameMode];
    const modeColor = this.gameMode === GameMode.RUSH ? '#ff9f43' : '#4ecdc4';
    this.modeIndicator = this.add.text(SCREEN_WIDTH - 16, 40, modeConfig.name.toUpperCase(), {
      fontSize: '12px',
      color: modeColor,
      fontFamily: 'Arial Black'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.weaponText = this.add.text(SCREEN_WIDTH - 16, SCREEN_HEIGHT - 48, 'Pistol', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(100);

    this.ammoText = this.add.text(SCREEN_WIDTH - 16, SCREEN_HEIGHT - 28, '12 / 12', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(100);

    this.reloadText = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50, 'RELOADING', {
      fontSize: '20px',
      color: '#ffff00',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

    this.perkPromptText = this.add.text(SCREEN_WIDTH / 2, 80, 'Press P to choose a perk!', {
      fontSize: '18px',
      color: '#ffd93d',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

    this.add.text(16, 16, 'Weapons: 1-9, 0', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(100);

    this.add.text(16, 32, 'R: Reload  P: Perks', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(100);

    this.powerupIcons = this.add.container(SCREEN_WIDTH - 40, 70);
    this.powerupIcons.setScrollFactor(0);
    this.powerupIcons.setDepth(100);
  }

  private updateHUD() {
    this.healthBar.clear();
    this.healthBar.fillStyle(0x440000, 1);
    this.healthBar.fillRect(16, SCREEN_HEIGHT - 32, 150, 16);
    this.healthBar.fillStyle(0xff0000, 1);
    const healthWidth = Math.max(0, (this.player.health / this.player.maxHealth) * 150);
    this.healthBar.fillRect(16, SCREEN_HEIGHT - 32, healthWidth, 16);

    this.xpBar.clear();
    this.xpBar.fillStyle(0x444400, 1);
    this.xpBar.fillRect(SCREEN_WIDTH / 2 - 100, SCREEN_HEIGHT - 20, 200, 12);
    this.xpBar.fillStyle(0xffff00, 1);
    const xpNeeded = getXpForLevel(this.player.level);
    const xpWidth = (this.player.experience / xpNeeded) * 200;
    this.xpBar.fillRect(SCREEN_WIDTH / 2 - 100, SCREEN_HEIGHT - 20, xpWidth, 12);

    this.levelText.setText(`Level ${this.player.level}`);
    this.killText.setText(`Kills: ${this.killCount}`);

    const wm = this.player.weaponManager;
    this.weaponText.setText(wm.currentWeapon.name);
    this.ammoText.setText(`${wm.currentAmmo} / ${wm.clipSize}`);

    if (wm.isCurrentlyReloading) {
      this.reloadText.setVisible(true);
      this.ammoText.setColor('#ffff00');
    } else {
      this.reloadText.setVisible(false);
      this.ammoText.setColor('#ffffff');
    }

    if (this.pendingPerks > 0 && !this.perkSelector.isOpen()) {
      this.perkPromptText.setVisible(true);
      this.perkPromptText.setText(`Press P to choose a perk! (${this.pendingPerks} pending)`);
    } else {
      this.perkPromptText.setVisible(false);
    }

    this.updatePowerupIcons();
  }

  private updatePowerupIcons() {
    this.powerupIcons.removeAll(true);

    let y = 0;
    const spacing = 30;

    if (this.player.hasActiveShield()) {
      const icon = this.add.sprite(0, y, 'bonus_shield').setScale(0.8);
      const text = this.add.text(20, y, `${Math.ceil(this.player.shieldTimer)}s`, {
        fontSize: '12px',
        color: '#00ffff'
      }).setOrigin(0, 0.5);
      this.powerupIcons.add(icon);
      this.powerupIcons.add(text);
      y += spacing;
    }

    if (this.player.hasActiveSpeed()) {
      const icon = this.add.sprite(0, y, 'bonus_speed').setScale(0.8);
      const text = this.add.text(20, y, `${Math.ceil(this.player.speedBoostTimer)}s`, {
        fontSize: '12px',
        color: '#00ff00'
      }).setOrigin(0, 0.5);
      this.powerupIcons.add(icon);
      this.powerupIcons.add(text);
      y += spacing;
    }

    if (this.player.hasActiveReflex()) {
      const icon = this.add.sprite(0, y, 'bonus_reflex').setScale(0.8);
      const text = this.add.text(20, y, `${Math.ceil(this.player.reflexBoostTimer)}s`, {
        fontSize: '12px',
        color: '#ff00ff'
      }).setOrigin(0, 0.5);
      this.powerupIcons.add(icon);
      this.powerupIcons.add(text);
    }
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    if (this.perkSelector.isOpen()) {
      this.perkSelector.update();
      return;
    }

    if (this.pendingPerks > 0 && Phaser.Input.Keyboard.JustDown(this.perkKey)) {
      this.perkSelector.show();
      return;
    }

    const pointer = this.input.activePointer;
    const leveledUp = this.player.update(delta, pointer);

    if (leveledUp) {
      this.showLevelUpEffect();
      this.pendingPerks++;
    }

    if (this.player.health <= 0) {
      this.handleGameOver();
      return;
    }

    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (c.active) {
        c.update(delta, this.player);
      }
    });

    this.bonusManager.update(delta);
    this.updateEnemyProjectiles(delta);
    this.spawnManager.update(delta, this.player.level);
    this.updateHUD();
  }

  private updateEnemyProjectiles(delta: number) {
    this.enemyProjectiles.getChildren().forEach((proj) => {
      const p = proj as Phaser.Physics.Arcade.Sprite;
      if (p.active) {
        if (p.x < 0 || p.x > WORLD_WIDTH || p.y < 0 || p.y > WORLD_HEIGHT) {
          p.setActive(false);
          p.setVisible(false);
          const body = p.body as Phaser.Physics.Arcade.Body;
          if (body) body.enable = false;
        }
      }
    });
  }

  private onBulletHitCreature(
    bullet: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    creature: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const proj = bullet as Projectile;
    const enemy = creature as Creature;

    if (!proj.active || !enemy.active) return;

    const hitAngle = proj.rotation;
    this.hitSparkEmitter.emitParticleAt(proj.x, proj.y);

    if (proj.isExplosive) {
      this.createExplosion(proj.x, proj.y, proj.explosionRadius, proj.damage);
      proj.destroy();
      return;
    }

    const applyPoison = proj.isPoisoned;
    const killed = enemy.takeDamage(proj.damage, applyPoison);

    if (!proj.penetrating) {
      proj.destroy();
    }

    if (killed) {
      this.onCreatureKilled(enemy, hitAngle);
    } else {
      this.spawnDirectionalBlood(enemy.x, enemy.y, hitAngle, 3);
    }
  }

  private createExplosion(x: number, y: number, radius: number, damage: number) {
    this.explosionEmitter.emitParticleAt(x, y, 3);
    this.cameras.main.shake(200, 0.015);
    this.cameras.main.flash(100, 255, 200, 100, false);

    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (!c.active) return;

      const dx = c.x - x;
      const dy = c.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        const falloff = 1 - (dist / radius);
        const explosionDamage = damage * falloff;
        const killed = c.takeDamage(explosionDamage);

        if (killed) {
          this.onCreatureKilled(c);
        }
      }
    });
  }

  private onCreatureKilled(enemy: Creature, hitAngle?: number) {
    const xpMultiplier = this.spawnManager.getXpMultiplier();
    this.player.addXp(Math.floor(enemy.xpValue * xpMultiplier));
    this.killCount++;

    const bloodyMess = this.player.perkManager.hasBloodyMess();
    const angle = hitAngle ?? Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
    this.spawnDirectionalBlood(enemy.x, enemy.y, angle, bloodyMess ? 16 : 8);
    this.spawnBloodDecal(enemy.x, enemy.y, bloodyMess, angle);
    this.spawnCorpse(enemy.x, enemy.y, enemy.creatureType);

    if (enemy.spawnsOnDeath && enemy.spawnCount > 0) {
      this.spawnManager.spawnBabySpiders(enemy.x, enemy.y, enemy.spawnCount);
    }

    this.bonusManager.trySpawnBonus(enemy.x, enemy.y);
    this.spawnXpOrb(enemy.x, enemy.y);
  }

  private onPlayerHitCreature(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    creature: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const p = player as Player;
    const enemy = creature as Creature;

    if (!enemy.active || p.health <= 0) return;

    enemy.attack(p);

    const dx = p.x - enemy.x;
    const dy = p.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      p.x += (dx / dist) * 5;
      p.y += (dy / dist) * 5;
    }

    if (enemy.damage > 0) {
      this.cameras.main.shake(50, 0.005);
      this.cameras.main.flash(50, 255, 0, 0, false);
    }
  }

  private onEnemyBulletHitPlayer(
    proj: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const bullet = proj as Phaser.Physics.Arcade.Sprite & { damage: number; isEnemyProjectile?: boolean };
    const p = player as Player;

    if (!bullet.active || !bullet.isEnemyProjectile) return;

    p.takeDamage(bullet.damage || 8);
    this.hitSparkEmitter.emitParticleAt(bullet.x, bullet.y);
    this.cameras.main.shake(50, 0.005);
    this.cameras.main.flash(50, 255, 0, 0, false);

    bullet.setActive(false);
    bullet.setVisible(false);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    if (body) body.enable = false;
  }

  private onPlayerPickupBonus(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    bonus: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const b = bonus as Bonus;
    if (!b.active) return;

    this.bonusManager.collectBonus(b);
    this.cameras.main.flash(100, 100, 255, 100, false);
  }

  private spawnDirectionalBlood(x: number, y: number, angle: number, quantity: number) {
    const speed = 80;
    const spread = 0.5;

    for (let i = 0; i < quantity; i++) {
      const particleAngle = angle + (Math.random() - 0.5) * spread;
      const particleSpeed = speed * (0.5 + Math.random() * 0.5);
      const vx = Math.cos(particleAngle) * particleSpeed;
      const vy = Math.sin(particleAngle) * particleSpeed;

      const particle = this.add.circle(x, y, 3 + Math.random() * 2, 0xbb0000);
      particle.setDepth(14);

      this.tweens.add({
        targets: particle,
        x: x + vx * 3,
        y: y + vy * 3,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  private spawnBloodDecal(x: number, y: number, extraBlood: boolean = false, angle?: number) {
    while (this.bloodDecals.getLength() >= this.maxBloodDecals) {
      const oldest = this.bloodDecals.getFirst(true) as Phaser.GameObjects.Sprite;
      if (oldest) oldest.destroy();
    }

    const decalCount = extraBlood ? 3 : 1;
    for (let i = 0; i < decalCount; i++) {
      let offsetX = i === 0 ? 0 : (Math.random() - 0.5) * 30;
      let offsetY = i === 0 ? 0 : (Math.random() - 0.5) * 30;

      if (angle !== undefined && i === 0) {
        offsetX = Math.cos(angle) * 15;
        offsetY = Math.sin(angle) * 15;
      }

      const decal = this.add.sprite(x + offsetX, y + offsetY, 'blood_decal');
      decal.setDepth(1);
      decal.setRotation(angle ?? Math.random() * Math.PI * 2);
      decal.setScale(0.5 + Math.random() * 0.5);
      decal.setAlpha(0.8);
      this.bloodDecals.add(decal);

      this.tweens.add({
        targets: decal,
        alpha: 0,
        duration: 10000,
        delay: 5000,
        onComplete: () => decal.destroy()
      });
    }
  }

  private spawnCorpse(x: number, y: number, creatureType: CreatureType) {
    const corpse = this.add.sprite(x, y, 'corpse');
    corpse.setDepth(2);
    corpse.setRotation(Math.random() * Math.PI * 2);
    corpse.setAlpha(0.7);

    const sizeScale = creatureType === CreatureType.BIG_ZOMBIE || creatureType === CreatureType.BOSS ? 1.5 :
                      creatureType === CreatureType.SPIDER || creatureType === CreatureType.BABY_SPIDER ? 0.5 :
                      creatureType === CreatureType.SPIDER_MOTHER || creatureType === CreatureType.ALIEN_BOSS ? 1.8 : 1.0;
    corpse.setScale(sizeScale * (0.8 + Math.random() * 0.4));

    this.bloodDecals.add(corpse);

    this.tweens.add({
      targets: corpse,
      alpha: 0,
      duration: 8000,
      delay: 4000,
      onComplete: () => corpse.destroy()
    });
  }

  private spawnXpOrb(x: number, y: number) {
    const orb = this.add.sprite(x, y, 'xp_orb');
    orb.setDepth(5);

    this.tweens.add({
      targets: orb,
      x: this.player.x,
      y: this.player.y,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        orb.destroy();
      }
    });
  }

  private showLevelUpEffect() {
    const text = this.add.text(
      this.player.x,
      this.player.y - 40,
      'LEVEL UP!',
      {
        fontSize: '24px',
        color: '#ffd93d',
        fontFamily: 'Arial Black'
      }
    ).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: this.player.y - 80,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy()
    });

    this.cameras.main.flash(100, 255, 217, 61, false);
    this.cameras.main.shake(100, 0.01);
  }

  private freezeAllEnemies(duration: number) {
    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (c.active) {
        c.freeze(duration);
      }
    });

    this.cameras.main.flash(200, 100, 200, 255, false);
    this.cameras.main.shake(100, 0.005);
  }

  private killHalfEnemies() {
    const activeCreatures = this.creatures.getChildren().filter(c => (c as Creature).active);
    const halfCount = Math.floor(activeCreatures.length / 2);

    for (let i = 0; i < halfCount; i++) {
      const c = activeCreatures[i] as Creature;
      this.onCreatureKilled(c);
      c.takeDamage(9999);
    }

    this.cameras.main.shake(200, 0.02);
    this.cameras.main.flash(200, 255, 255, 100, false);
  }

  private nukeAllEnemies() {
    this.cameras.main.shake(300, 0.03);
    this.cameras.main.flash(300, 255, 255, 200, false);

    const xpMultiplier = this.spawnManager.getXpMultiplier();
    this.creatures.getChildren().forEach((creature) => {
      const c = creature as Creature;
      if (c.active) {
        this.player.addXp(Math.floor(c.xpValue * xpMultiplier));
        this.killCount++;
        const angle = Math.random() * Math.PI * 2;
        this.spawnDirectionalBlood(c.x, c.y, angle, 16);
        this.spawnBloodDecal(c.x, c.y, true, angle);
        this.spawnCorpse(c.x, c.y, c.creatureType);
        c.takeDamage(9999);
      }
    });
  }

  private handleGameOver() {
    this.gameOver = true;

    const timePlayed = Date.now() - this.gameStartTime;
    const { rank, isHighScore } = this.highScoreManager.addScore(
      this.killCount,
      this.player.level,
      timePlayed,
      this.gameMode
    );

    const centerX = this.cameras.main.scrollX + SCREEN_WIDTH / 2;
    const centerY = this.cameras.main.scrollY + SCREEN_HEIGHT / 2;

    this.add.rectangle(
      centerX,
      centerY,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0x000000,
      0.7
    ).setDepth(200);

    this.add.text(centerX, centerY - 100, 'GAME OVER', {
      fontSize: '48px',
      color: '#ff6b6b',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(201);

    const modeConfig = GAME_MODE_CONFIGS[this.gameMode];
    const modeColor = this.gameMode === GameMode.RUSH ? '#ff9f43' : '#4ecdc4';
    this.add.text(centerX, centerY - 55, modeConfig.name.toUpperCase() + ' MODE', {
      fontSize: '18px',
      color: modeColor,
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(201);

    const score = this.killCount * 100 + this.player.level * 500 + Math.floor(timePlayed / 100);
    const finalScore = this.gameMode === GameMode.RUSH ? Math.floor(score * 1.2) : score;
    this.add.text(centerX, centerY - 15, `Score: ${finalScore}`, {
      fontSize: '28px',
      color: '#ffd93d',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(201);

    if (isHighScore) {
      this.add.text(centerX, centerY + 25, `NEW HIGH SCORE! Rank #${rank}`, {
        fontSize: '20px',
        color: '#00ff00',
        fontFamily: 'Arial Black'
      }).setOrigin(0.5).setDepth(201);
    }

    this.add.text(centerX, centerY + 65, `Kills: ${this.killCount}  |  Level: ${this.player.level}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    this.add.text(centerX, centerY + 95, `Time: ${this.highScoreManager.formatTime(timePlayed)}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    this.add.text(centerX, centerY + 140, 'Click to return to menu', {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', () => {
        this.scene.start('MenuScene');
      });
    });
  }
}
