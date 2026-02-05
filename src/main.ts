import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { TutorialScene } from './scenes/TutorialScene';
import { TypoScene } from './scenes/TypoScene';
import { QuestScene } from './scenes/QuestScene';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  parent: 'game',
  backgroundColor: '#0a0a0c',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [BootScene, MenuScene, GameScene, TutorialScene, TypoScene, QuestScene]
};

new Phaser.Game(config);
