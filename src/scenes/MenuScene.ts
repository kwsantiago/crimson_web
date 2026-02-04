import Phaser from 'phaser';
import { HighScoreManager } from '../systems/HighScoreManager';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config';

export class MenuScene extends Phaser.Scene {
  private highScoreManager!: HighScoreManager;
  private showingScores: boolean = false;
  private menuContainer!: Phaser.GameObjects.Container;
  private scoresContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('MenuScene');
  }

  create() {
    this.highScoreManager = new HighScoreManager();
    this.showingScores = false;

    this.createMenuContainer();
    this.createScoresContainer();

    this.showMenu();
  }

  private createMenuContainer() {
    this.menuContainer = this.add.container(0, 0);

    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;

    const title = this.add.text(centerX, 100, 'CRIMSONLAND', {
      fontSize: '56px',
      color: '#ff6b6b',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    const subtitle = this.add.text(centerX, 160, 'Browser Remake', {
      fontSize: '18px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    const playButton = this.createButton(centerX, centerY - 30, 'PLAY', () => {
      this.scene.start('GameScene');
    });

    const scoresButton = this.createButton(centerX, centerY + 40, 'HIGH SCORES', () => {
      this.showScores();
    });

    const highScore = this.highScoreManager.getHighScore();
    const highScoreText = this.add.text(centerX, centerY + 120, `Best Score: ${highScore}`, {
      fontSize: '18px',
      color: '#ffd93d',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    const controls = this.add.text(centerX, SCREEN_HEIGHT - 80, 'WASD to move | Mouse to aim | Click to shoot', {
      fontSize: '14px',
      color: '#666666',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    const controls2 = this.add.text(centerX, SCREEN_HEIGHT - 55, 'R to reload | P to select perks | 1-9 for weapons', {
      fontSize: '14px',
      color: '#666666',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    this.menuContainer.add([title, subtitle, playButton, scoresButton, highScoreText, controls, controls2]);
  }

  private createScoresContainer() {
    this.scoresContainer = this.add.container(0, 0);
    this.scoresContainer.setVisible(false);

    const centerX = SCREEN_WIDTH / 2;

    const title = this.add.text(centerX, 50, 'HIGH SCORES', {
      fontSize: '36px',
      color: '#ffd93d',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    this.scoresContainer.add(title);

    const scores = this.highScoreManager.getScores();

    if (scores.length === 0) {
      const noScores = this.add.text(centerX, 200, 'No scores yet!', {
        fontSize: '20px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.scoresContainer.add(noScores);
    } else {
      const headerY = 100;
      const headers = this.add.text(centerX, headerY, 'RANK    SCORE    KILLS    LEVEL    TIME', {
        fontSize: '14px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.scoresContainer.add(headers);

      for (let i = 0; i < scores.length; i++) {
        const score = scores[i];
        const y = 140 + i * 35;
        const color = i === 0 ? '#ffd93d' : i < 3 ? '#cccccc' : '#888888';

        const rank = `${i + 1}.`.padStart(3);
        const scoreStr = score.score.toString().padStart(8);
        const kills = score.kills.toString().padStart(6);
        const level = score.level.toString().padStart(6);
        const time = this.highScoreManager.formatTime(score.time);

        const row = this.add.text(centerX, y, `${rank}    ${scoreStr}    ${kills}    ${level}    ${time}`, {
          fontSize: '16px',
          color,
          fontFamily: 'monospace'
        }).setOrigin(0.5);
        this.scoresContainer.add(row);
      }
    }

    const backButton = this.createButton(centerX, SCREEN_HEIGHT - 80, 'BACK', () => {
      this.showMenu();
    });
    this.scoresContainer.add(backButton);
  }

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 200, 50, 0x333333)
      .setStrokeStyle(2, 0x666666)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x444444);
      bg.setStrokeStyle(2, 0xffd93d);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x333333);
      bg.setStrokeStyle(2, 0x666666);
    });

    bg.on('pointerdown', callback);

    container.add([bg, label]);
    return container;
  }

  private showMenu() {
    this.showingScores = false;
    this.menuContainer.setVisible(true);
    this.scoresContainer.setVisible(false);
  }

  private showScores() {
    this.showingScores = true;
    this.menuContainer.setVisible(false);
    this.scoresContainer.setVisible(true);
  }
}
