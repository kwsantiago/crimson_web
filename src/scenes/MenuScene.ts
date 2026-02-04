import Phaser from 'phaser';
import { HighScoreManager } from '../systems/HighScoreManager';
import { GameMode, GAME_MODE_CONFIGS } from '../data/gameModes';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config';

type MenuState = 'main' | 'mode_select' | 'scores';

export class MenuScene extends Phaser.Scene {
  private highScoreManager!: HighScoreManager;
  private menuState: MenuState = 'main';
  private selectedMode: GameMode = GameMode.SURVIVAL;
  private mainContainer!: Phaser.GameObjects.Container;
  private modeSelectContainer!: Phaser.GameObjects.Container;
  private scoresContainer!: Phaser.GameObjects.Container;
  private scoresMode: GameMode = GameMode.SURVIVAL;

  constructor() {
    super('MenuScene');
  }

  create() {
    this.highScoreManager = new HighScoreManager();
    this.menuState = 'main';
    this.selectedMode = GameMode.SURVIVAL;
    this.scoresMode = GameMode.SURVIVAL;

    this.createMainMenu();
    this.createModeSelect();
    this.createScoresMenu();

    this.showMain();
  }

  private createMainMenu() {
    this.mainContainer = this.add.container(0, 0);

    const centerX = SCREEN_WIDTH / 2;

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

    const playButton = this.createButton(centerX, 250, 'PLAY', () => {
      this.showModeSelect();
    });

    const scoresButton = this.createButton(centerX, 320, 'HIGH SCORES', () => {
      this.showScores();
    });

    const bestSurvival = this.highScoreManager.getHighScore(GameMode.SURVIVAL);
    const bestRush = this.highScoreManager.getHighScore(GameMode.RUSH);

    const survivalScoreText = this.add.text(centerX, 400, `Best Survival: ${bestSurvival}`, {
      fontSize: '16px',
      color: '#ffd93d',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    const rushScoreText = this.add.text(centerX, 425, `Best Rush: ${bestRush}`, {
      fontSize: '16px',
      color: '#ff9f43',
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

    this.mainContainer.add([
      title, subtitle, playButton, scoresButton,
      survivalScoreText, rushScoreText, controls, controls2
    ]);
  }

  private createModeSelect() {
    this.modeSelectContainer = this.add.container(0, 0);
    this.modeSelectContainer.setVisible(false);

    const centerX = SCREEN_WIDTH / 2;

    const title = this.add.text(centerX, 80, 'SELECT GAME MODE', {
      fontSize: '36px',
      color: '#ffd93d',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    this.modeSelectContainer.add(title);

    const survivalConfig = GAME_MODE_CONFIGS[GameMode.SURVIVAL];
    const survivalButton = this.createModeButton(
      centerX,
      200,
      survivalConfig.name,
      survivalConfig.description,
      '#4ecdc4',
      () => {
        this.selectedMode = GameMode.SURVIVAL;
        this.startGame();
      }
    );

    const rushConfig = GAME_MODE_CONFIGS[GameMode.RUSH];
    const rushButton = this.createModeButton(
      centerX,
      320,
      rushConfig.name,
      rushConfig.description,
      '#ff9f43',
      () => {
        this.selectedMode = GameMode.RUSH;
        this.startGame();
      }
    );

    const backButton = this.createButton(centerX, SCREEN_HEIGHT - 80, 'BACK', () => {
      this.showMain();
    });

    this.modeSelectContainer.add([survivalButton, rushButton, backButton]);
  }

  private createModeButton(
    x: number,
    y: number,
    name: string,
    description: string,
    color: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 400, 80, 0x333333)
      .setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color)
      .setInteractive({ useHandCursor: true });

    const nameText = this.add.text(0, -15, name.toUpperCase(), {
      fontSize: '24px',
      color: color,
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    const descText = this.add.text(0, 15, description, {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x444444);
      bg.setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(color).color);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x333333);
      bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(color).color);
    });

    bg.on('pointerdown', callback);

    container.add([bg, nameText, descText]);
    return container;
  }

  private createScoresMenu() {
    this.scoresContainer = this.add.container(0, 0);
    this.scoresContainer.setVisible(false);
  }

  private rebuildScoresMenu() {
    this.scoresContainer.removeAll(true);

    const centerX = SCREEN_WIDTH / 2;

    const title = this.add.text(centerX, 40, 'HIGH SCORES', {
      fontSize: '32px',
      color: '#ffd93d',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    this.scoresContainer.add(title);

    const survivalTab = this.createTabButton(centerX - 80, 85, 'SURVIVAL',
      this.scoresMode === GameMode.SURVIVAL, () => {
        this.scoresMode = GameMode.SURVIVAL;
        this.rebuildScoresMenu();
      });

    const rushTab = this.createTabButton(centerX + 80, 85, 'RUSH',
      this.scoresMode === GameMode.RUSH, () => {
        this.scoresMode = GameMode.RUSH;
        this.rebuildScoresMenu();
      });

    this.scoresContainer.add([survivalTab, rushTab]);

    const scores = this.highScoreManager.getScores(this.scoresMode);

    if (scores.length === 0) {
      const noScores = this.add.text(centerX, 220, 'No scores yet!', {
        fontSize: '20px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.scoresContainer.add(noScores);
    } else {
      const headerY = 130;
      const headers = this.add.text(centerX, headerY, 'RANK    SCORE    KILLS    LEVEL    TIME', {
        fontSize: '14px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5);
      this.scoresContainer.add(headers);

      for (let i = 0; i < scores.length; i++) {
        const score = scores[i];
        const y = 165 + i * 32;
        const color = i === 0 ? '#ffd93d' : i < 3 ? '#cccccc' : '#888888';

        const rank = `${i + 1}.`.padStart(3);
        const scoreStr = score.score.toString().padStart(8);
        const kills = score.kills.toString().padStart(6);
        const level = score.level.toString().padStart(6);
        const time = this.highScoreManager.formatTime(score.time);

        const row = this.add.text(centerX, y, `${rank}    ${scoreStr}    ${kills}    ${level}    ${time}`, {
          fontSize: '15px',
          color,
          fontFamily: 'monospace'
        }).setOrigin(0.5);
        this.scoresContainer.add(row);
      }
    }

    const backButton = this.createButton(centerX, SCREEN_HEIGHT - 60, 'BACK', () => {
      this.showMain();
    });
    this.scoresContainer.add(backButton);
  }

  private createTabButton(
    x: number,
    y: number,
    text: string,
    active: boolean,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bgColor = active ? 0x555555 : 0x333333;
    const borderColor = active ? 0xffd93d : 0x666666;

    const bg = this.add.rectangle(0, 0, 140, 35, bgColor)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontSize: '14px',
      color: active ? '#ffd93d' : '#aaaaaa',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    if (!active) {
      bg.on('pointerover', () => {
        bg.setFillStyle(0x444444);
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(0x333333);
      });
    }

    bg.on('pointerdown', callback);

    container.add([bg, label]);
    return container;
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

  private showMain() {
    this.menuState = 'main';
    this.mainContainer.setVisible(true);
    this.modeSelectContainer.setVisible(false);
    this.scoresContainer.setVisible(false);
  }

  private showModeSelect() {
    this.menuState = 'mode_select';
    this.mainContainer.setVisible(false);
    this.modeSelectContainer.setVisible(true);
    this.scoresContainer.setVisible(false);
  }

  private showScores() {
    this.menuState = 'scores';
    this.mainContainer.setVisible(false);
    this.modeSelectContainer.setVisible(false);
    this.scoresContainer.setVisible(true);
    this.rebuildScoresMenu();
  }

  private startGame() {
    this.scene.start('GameScene', { gameMode: this.selectedMode });
  }
}
