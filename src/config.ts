export const WORLD_WIDTH = 1024;
export const WORLD_HEIGHT = 1024;
export const SCREEN_WIDTH = 800;
export const SCREEN_HEIGHT = 600;

export const PLAYER_BASE_SPEED = 150;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_RADIUS = 12;

export const XP_PER_LEVEL_BASE = 100;
export const XP_MULTIPLIER = 1.5;

export function getXpForLevel(level: number): number {
  return Math.floor(XP_PER_LEVEL_BASE * Math.pow(XP_MULTIPLIER, level - 1));
}

export const UI = {
  BASE_WIDTH: 640,
  BASE_HEIGHT: 480,
  HUD_BASE_WIDTH: 1024,
  HUD_BASE_HEIGHT: 768,

  COLORS: {
    TEXT: 0xdcdcdc,
    TEXT_HINT: 0xaaaab4,
    ACCENT: 0xf0c850,
    MENU_ITEM: 0x46b4f0,
    SCORE_LABEL: 0xe6e6e6,
    SCORE_VALUE: 0xe6e6ff,
    XP_BAR: 0x1a4d99,
    XP_BAR_BG: 0x0f2952,
    HEALTH_BAR: 0xcc0000,
    HEALTH_BAR_BG: 0x440000,
    SHADOW: 0x444444,
    PANEL_BG: 0x1a1a1a,
    PANEL_BORDER: 0x333333,
  },

  ALPHA: {
    TOP_BAR: 0.7,
    ICON: 0.8,
    PANEL: 0.9,
    HEALTH_BG: 0.5,
    AMMO_DIM: 0.3,
    MENU_ITEM_IDLE: 0.6,
    MENU_ITEM_HOVER: 1.0,
    SHADOW: 0.27,
  },

  SHADOW_OFFSET: 7,

  HUD: {
    TOP_BAR_POS: { x: 0, y: 0 },
    TOP_BAR_SIZE: { w: 512, h: 64 },
    HEART_CENTER: { x: 27, y: 21 },
    HEALTH_BAR_POS: { x: 64, y: 16 },
    HEALTH_BAR_SIZE: { w: 120, h: 9 },
    WEAPON_ICON_POS: { x: 220, y: 2 },
    WEAPON_ICON_SIZE: { w: 64, h: 32 },
    AMMO_BASE_POS: { x: 300, y: 10 },
    AMMO_BAR_SIZE: { w: 6, h: 16 },
    AMMO_BAR_STEP: 6,
    SURV_PANEL_POS: { x: -68, y: 60 },
    SURV_XP_LABEL_POS: { x: 4, y: 78 },
    SURV_XP_VALUE_POS: { x: 26, y: 74 },
    SURV_LVL_VALUE_POS: { x: 85, y: 79 },
    SURV_PROGRESS_POS: { x: 26, y: 91 },
    SURV_PROGRESS_WIDTH: 54,
  },

  MENU: {
    PANEL_WIDTH: 510,
    PANEL_HEIGHT: 450,
    PANEL_OFFSET_X: 21,
    PANEL_OFFSET_Y: -81,
    PANEL_BASE_X: -45,
    PANEL_BASE_Y: 210,
    LABEL_BASE_X: -60,
    LABEL_BASE_Y: 210,
    LABEL_STEP: 60,
    SIGN_WIDTH: 571.44,
    SIGN_HEIGHT: 141.36,
  },

  PERK: {
    PANEL_X: -108,
    PANEL_Y: 29,
    PANEL_W: 510,
    PANEL_H: 378,
    ANIM_START_MS: 400,
    ANIM_END_MS: 100,
    TITLE_X: 54,
    TITLE_Y: 6,
    LIST_Y: 50,
    LIST_STEP: 19,
    DESC_X: -12,
    DESC_Y_AFTER_LIST: 32,
    BUTTON_X: 162,
    BUTTON_Y: 276,
  },

  GAME_OVER: {
    PANEL_X: -45,
    PANEL_Y: 210,
    PANEL_W: 512,
    PANEL_H: 340,
    PANEL_OFFSET_X: 20,
    PANEL_OFFSET_Y: -82,
    SLIDE_DURATION_MS: 250,
    BANNER_W: 256,
    BANNER_H: 64,
    INPUT_BOX_W: 166,
    INPUT_BOX_H: 18,
  },

  ANIM: {
    PANEL_SLIDE_MS: 250,
    MENU_ITEM_HOVER_RATE: 6,
    MENU_ITEM_UNHOVER_RATE: 2,
    BUTTON_HOVER_RATE: 6,
    BUTTON_PRESS_RATE: 6,
  },
};
