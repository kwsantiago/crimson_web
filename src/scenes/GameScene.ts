import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Creature } from '../entities/Creature';
import { Projectile } from '../entities/Projectile';
import { SpawnManager } from '../systems/SpawnManager';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  PLAYER_RADIUS,
  ZOMBIE_RADIUS,
  getXpForLevel
} from '../config';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private creatures!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private spawnManager!: SpawnManager;
  private healthBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private killCount: number = 0;
  private killText!: Phaser.GameObjects.Text;
  private gameOver: boolean = false;

  constructor() {
    super('GameScene');
  }

  create() {
    this.gameOver = false;
    this.killCount = 0;

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createBackground();

    this.projectiles = this.physics.add.group({
      classType: Projectile,
      maxSize: 100,
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

    this.spawnManager = new SpawnManager(this, this.creatures);

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

    this.spawnManager.update(delta);
    this.updateHUD();
  }

  private onBulletHitCreature(
    bullet: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    creature: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const proj = bullet as Projectile;
    const enemy = creature as Creature;

    if (!proj.active || !enemy.active) return;

    const killed = enemy.takeDamage(proj.damage);
    proj.destroy();

    if (killed) {
      this.player.addXp(enemy.xpValue);
      this.killCount++;
      this.spawnXpOrb(enemy.x, enemy.y);
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

    const overlay = this.add.rectangle(
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
