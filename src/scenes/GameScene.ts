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
  getXpForLevel,
  UI
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
    graphics.fillStyle(0x3f3819, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.setDepth(-11);

    const terrain = this.textures.get('terrain');
    if (terrain && terrain.key !== '__MISSING') {
      const terrainWidth = terrain.getSourceImage().width;
      const terrainHeight = terrain.getSourceImage().height;

      for (let x = 0; x < WORLD_WIDTH; x += terrainWidth) {
        for (let y = 0; y < WORLD_HEIGHT; y += terrainHeight) {
          const tile = this.add.image(x, y, 'terrain');
          tile.setOrigin(0, 0);
          tile.setDepth(-10);
          tile.setTint(0xb2b2b2);
          tile.setAlpha(0.9);
        }
      }
    }
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

    this.levelText = this.add.text(8, 68, 'Lv 1', {
      fontSize: '14px',
      color: '#dcdcdc',
      fontFamily: 'Arial Black'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(100);

    this.killText = this.add.text(SCREEN_WIDTH - 16, 16, 'Kills: 0', {
      fontSize: '14px',
      color: '#dcdcdc',
      fontFamily: 'Arial'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    const modeConfig = GAME_MODE_CONFIGS[this.gameMode];
    const modeColor = this.gameMode === GameMode.RUSH ? '#f0c850' : '#46b4f0';
    this.modeIndicator = this.add.text(SCREEN_WIDTH - 16, 36, modeConfig.name.toUpperCase(), {
      fontSize: '11px',
      color: modeColor,
      fontFamily: 'Arial Black'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    this.weaponText = this.add.text(SCREEN_WIDTH - 16, SCREEN_HEIGHT - 42, 'Pistol', {
      fontSize: '13px',
      color: '#dcdcdc',
      fontFamily: 'Arial'
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(100);

    this.ammoText = this.add.text(SCREEN_WIDTH - 16, SCREEN_HEIGHT - 24, '12 / 12', {
      fontSize: '16px',
      color: '#dcdcdc',
      fontFamily: 'Arial Black'
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(100);

    this.reloadText = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50, 'RELOADING', {
      fontSize: '18px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

    this.perkPromptText = this.add.text(SCREEN_WIDTH / 2, 60, 'Press P to choose a perk!', {
      fontSize: '16px',
      color: '#f0c850',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

    this.add.text(8, SCREEN_HEIGHT - 24, 'WASD Move | R Reload | P Perks', {
      fontSize: '10px',
      color: '#aaaab4',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(100);

    this.powerupIcons = this.add.container(8, 90);
    this.powerupIcons.setScrollFactor(0);
    this.powerupIcons.setDepth(100);
  }

  private updateHUD() {
    this.healthBar.clear();

    this.healthBar.fillStyle(UI.COLORS.SHADOW, UI.ALPHA.SHADOW);
    this.healthBar.fillRoundedRect(8 + UI.SHADOW_OFFSET, 8 + UI.SHADOW_OFFSET, 124, 52, 4);

    this.healthBar.fillStyle(0x1a1612, UI.ALPHA.PANEL);
    this.healthBar.fillRoundedRect(8, 8, 124, 52, 4);
    this.healthBar.lineStyle(1, 0x3d3830, 0.8);
    this.healthBar.strokeRoundedRect(8, 8, 124, 52, 4);

    this.healthBar.fillStyle(UI.COLORS.HEALTH_BAR_BG, UI.ALPHA.HEALTH_BG);
    this.healthBar.fillRect(12, 16, 116, 9);
    this.healthBar.fillStyle(UI.COLORS.HEALTH_BAR, UI.ALPHA.ICON);
    const healthWidth = Math.max(0, (this.player.health / this.player.maxHealth) * 116);
    this.healthBar.fillRect(12, 16, healthWidth, 9);

    this.xpBar.clear();

    this.xpBar.fillStyle(UI.COLORS.XP_BAR_BG, 0.6);
    this.xpBar.fillRect(12, 48, 116, 8);
    this.xpBar.fillStyle(UI.COLORS.XP_BAR, 1);
    const xpNeeded = getXpForLevel(this.player.level);
    const xpWidth = Math.min(116, (this.player.experience / xpNeeded) * 116);
    this.xpBar.fillRect(12, 48, xpWidth, 8);

    this.healthBar.fillStyle(0xcc3333, 0.8);
    const heartPulse = Math.sin(this.time.now * 0.005) * 2 + 10;
    this.healthBar.fillCircle(24, 38, heartPulse);

    this.levelText.setText(`Lv ${this.player.level}`);
    this.killText.setText(`Kills: ${this.killCount}`);

    const wm = this.player.weaponManager;
    this.weaponText.setText(wm.currentWeapon.name);
    this.ammoText.setText(`${wm.currentAmmo} / ${wm.clipSize}`);

    if (wm.isCurrentlyReloading) {
      this.reloadText.setVisible(true);
      this.ammoText.setColor('#f0c850');
    } else {
      this.reloadText.setVisible(false);
      this.ammoText.setColor('#dcdcdc');
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
    const spacing = 44;

    const drawBonusSlot = (icon: Phaser.GameObjects.Sprite, label: string, timer: number, barColor: number) => {
      const panel = this.add.graphics();
      panel.fillStyle(0x1a1612, 0.7);
      panel.fillRoundedRect(-4, y - 14, 120, 40, 4);
      panel.lineStyle(1, 0x3d3830, 0.5);
      panel.strokeRoundedRect(-4, y - 14, 120, 40, 4);
      this.powerupIcons.add(panel);

      icon.setScale(0.7);
      this.powerupIcons.add(icon);

      const labelText = this.add.text(36, y - 4, label, {
        fontSize: '11px',
        color: '#dcdcdc',
        fontFamily: 'Arial'
      }).setOrigin(0, 0.5);
      this.powerupIcons.add(labelText);

      const barBg = this.add.graphics();
      barBg.fillStyle(UI.COLORS.XP_BAR_BG, 0.5);
      barBg.fillRect(36, y + 6, 70, 6);
      this.powerupIcons.add(barBg);

      const barFill = this.add.graphics();
      const ratio = Math.min(1, timer / 20);
      barFill.fillStyle(barColor, 0.8);
      barFill.fillRect(36, y + 6, 70 * ratio, 6);
      this.powerupIcons.add(barFill);
    };

    if (this.player.hasActiveShield()) {
      const icon = this.add.sprite(14, y, 'bonus_shield');
      drawBonusSlot(icon, 'Shield', this.player.shieldTimer, 0x00aaff);
      y += spacing;
    }

    if (this.player.hasActiveSpeed()) {
      const icon = this.add.sprite(14, y, 'bonus_speed');
      drawBonusSlot(icon, 'Speed', this.player.speedBoostTimer, 0x00ff44);
      y += spacing;
    }

    if (this.player.hasActiveReflex()) {
      const icon = this.add.sprite(14, y, 'bonus_reflex');
      drawBonusSlot(icon, 'Reflex', this.player.reflexBoostTimer, 0xff00ff);
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
      0.8
    ).setDepth(200);

    const panelW = UI.GAME_OVER.PANEL_W;
    const panelH = UI.GAME_OVER.PANEL_H;

    const panelGraphics = this.add.graphics();
    panelGraphics.setDepth(200);

    panelGraphics.fillStyle(UI.COLORS.SHADOW, UI.ALPHA.SHADOW);
    panelGraphics.fillRoundedRect(
      centerX - panelW / 2 + UI.SHADOW_OFFSET,
      centerY - panelH / 2 + UI.SHADOW_OFFSET,
      panelW,
      panelH,
      8
    );

    panelGraphics.fillStyle(0x1a1612, UI.ALPHA.PANEL);
    panelGraphics.fillRoundedRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 8);

    panelGraphics.lineStyle(2, 0x3d3830, 0.8);
    panelGraphics.strokeRoundedRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 8);

    panelGraphics.lineStyle(1, 0x4a4438, 0.5);
    panelGraphics.strokeRoundedRect(
      centerX - panelW / 2 + 4,
      centerY - panelH / 2 + 4,
      panelW - 8,
      panelH - 8,
      6
    );

    this.add.text(centerX, centerY - 90, 'THE REAPER', {
      fontSize: '32px',
      color: '#cc3333',
      fontFamily: 'Arial Black',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(201);

    const modeConfig = GAME_MODE_CONFIGS[this.gameMode];
    const modeColor = this.gameMode === GameMode.RUSH ? '#f0c850' : '#46b4f0';
    this.add.text(centerX, centerY - 55, modeConfig.name.toUpperCase() + ' MODE', {
      fontSize: '14px',
      color: modeColor,
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(201);

    const score = this.killCount * 100 + this.player.level * 500 + Math.floor(timePlayed / 100);
    const finalScore = this.gameMode === GameMode.RUSH ? Math.floor(score * 1.2) : score;

    this.add.text(centerX - 80, centerY - 25, 'Score', {
      fontSize: '13px',
      color: '#e6e6e6',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    this.add.text(centerX - 80, centerY - 5, `${finalScore}`, {
      fontSize: '18px',
      color: '#e6e6ff',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(201);

    if (isHighScore) {
      this.add.text(centerX - 80, centerY + 18, `Rank: ${this.getOrdinal(rank)}`, {
        fontSize: '12px',
        color: '#f0c850',
        fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(201);
    }

    panelGraphics.lineStyle(1, 0x3d3830, 0.5);
    panelGraphics.lineBetween(centerX - 20, centerY - 30, centerX - 20, centerY + 30);

    this.add.text(centerX + 60, centerY - 25, 'Game time', {
      fontSize: '13px',
      color: '#e6e6e6',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    this.add.text(centerX + 60, centerY - 5, this.highScoreManager.formatTime(timePlayed), {
      fontSize: '16px',
      color: '#dcdcdc',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    this.add.text(centerX, centerY + 50, `Frags: ${this.killCount}`, {
      fontSize: '14px',
      color: '#e6e6e6',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    this.add.text(centerX, centerY + 72, `Level: ${this.player.level}`, {
      fontSize: '14px',
      color: '#e6e6e6',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    const playAgainBtn = this.createGameOverButton(centerX - 80, centerY + 105, 'Play Again', () => {
      this.scene.start('GameScene', { gameMode: this.gameMode });
    });
    playAgainBtn.setDepth(201);

    const menuBtn = this.createGameOverButton(centerX + 80, centerY + 105, 'Main Menu', () => {
      this.scene.start('MenuScene');
    });
    menuBtn.setDepth(201);
  }

  private createGameOverButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const btnW = 130;
    const btnH = 28;

    const bg = this.add.rectangle(0, 0, btnW, btnH, 0x222222, 0.9);
    bg.setStrokeStyle(2, 0x444444);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontSize: '13px',
      color: '#dcdcdc',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x404070, 0.9);
      bg.setStrokeStyle(2, 0x8080b0);
      text.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x222222, 0.9);
      bg.setStrokeStyle(2, 0x444444);
      text.setColor('#dcdcdc');
    });

    bg.on('pointerdown', callback);

    container.add([bg, text]);
    return container;
  }

  private getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}
