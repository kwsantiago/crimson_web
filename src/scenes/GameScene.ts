import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Creature } from '../entities/Creature';
import { Projectile } from '../entities/Projectile';
import { SpawnManager } from '../systems/SpawnManager';
import { CreatureType } from '../data/creatures';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  getXpForLevel
} from '../config';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private creatures!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private spawnManager!: SpawnManager;
  private bloodDecals!: Phaser.GameObjects.Group;
  private healthBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private killCount: number = 0;
  private killText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private reloadText!: Phaser.GameObjects.Text;
  private gameOver: boolean = false;
  private hitSparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloodEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private maxBloodDecals: number = 100;

  constructor() {
    super('GameScene');
  }

  create() {
    this.gameOver = false;
    this.killCount = 0;

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createBackground();
    this.createParticleSystems();

    this.bloodDecals = this.add.group();

    this.projectiles = this.physics.add.group({
      classType: Projectile,
      maxSize: 200,
      runChildUpdate: true
    });

    this.enemyProjectiles = this.physics.add.group({
      maxSize: 50,
      runChildUpdate: true
    });

    this.creatures = this.physics.add.group({
      classType: Creature,
      runChildUpdate: false
    });

    this.player = new Player(
      this,
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      this.projectiles
    );

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.spawnManager = new SpawnManager(this, this.creatures, this.enemyProjectiles);

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

    this.createHUD();
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

    this.add.text(16, 16, 'Weapons: 1-5', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(100);

    this.add.text(16, 32, 'R: Reload', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setScrollFactor(0).setDepth(100);
  }

  private updateHUD() {
    this.healthBar.clear();
    this.healthBar.fillStyle(0x440000, 1);
    this.healthBar.fillRect(16, SCREEN_HEIGHT - 32, 150, 16);
    this.healthBar.fillStyle(0xff0000, 1);
    const healthWidth = (this.player.health / this.player.maxHealth) * 150;
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
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    const pointer = this.input.activePointer;
    const leveledUp = this.player.update(delta, pointer);

    if (leveledUp) {
      this.showLevelUpEffect();
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

    this.hitSparkEmitter.emitParticleAt(proj.x, proj.y);

    const killed = enemy.takeDamage(proj.damage);

    if (!proj.penetrating) {
      proj.destroy();
    }

    if (killed) {
      this.player.addXp(enemy.xpValue);
      this.killCount++;
      this.spawnBloodEffect(enemy.x, enemy.y);
      this.spawnBloodDecal(enemy.x, enemy.y);

      if (enemy.spawnsOnDeath && enemy.spawnCount > 0) {
        this.spawnManager.spawnBabySpiders(enemy.x, enemy.y, enemy.spawnCount);
      }

      this.spawnXpOrb(enemy.x, enemy.y);
    } else {
      this.bloodEmitter.emitParticleAt(enemy.x, enemy.y, 3);
    }
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

    bullet.setActive(false);
    bullet.setVisible(false);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    if (body) body.enable = false;
  }

  private spawnBloodEffect(x: number, y: number) {
    this.bloodEmitter.emitParticleAt(x, y);
  }

  private spawnBloodDecal(x: number, y: number) {
    while (this.bloodDecals.getLength() >= this.maxBloodDecals) {
      const oldest = this.bloodDecals.getFirst(true) as Phaser.GameObjects.Sprite;
      if (oldest) oldest.destroy();
    }

    const decal = this.add.sprite(x, y, 'blood_decal');
    decal.setDepth(1);
    decal.setRotation(Math.random() * Math.PI * 2);
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
  }

  private handleGameOver() {
    this.gameOver = true;

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

    this.add.text(centerX, centerY - 50, 'GAME OVER', {
      fontSize: '48px',
      color: '#ff6b6b',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(201);

    this.add.text(centerX, centerY + 20, `Kills: ${this.killCount}`, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    this.add.text(centerX, centerY + 60, `Level: ${this.player.level}`, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    this.add.text(centerX, centerY + 120, 'Click to restart', {
      fontSize: '18px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(201);

    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', () => {
        this.scene.restart();
      });
    });
  }
}
