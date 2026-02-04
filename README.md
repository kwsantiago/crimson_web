# Crimson Web

Browser-based clone of Crimsonland (2003) built with Phaser 3 and TypeScript.

## Setup

1. Clone the [crimson](https://github.com/banteg/crimson) Python reimplementation:
```bash
git clone https://github.com/banteg/crimson.git
cd crimson
```

2. Extract assets (auto-downloads .paq files on first run):
```bash
uv run crimson extract ~/.local/share/banteg/crimsonland /path/to/crimson_web/public/assets/game
```

3. Install and run:
```bash
cd /path/to/crimson_web
bun install
bun run dev
```

Open http://localhost:5173

## Controls

- **WASD** - Move
- **Mouse** - Aim
- **Left Click** - Shoot
- **R** - Reload
- **P** - Open perk menu (when available)
- **1-5** - Switch weapons

## Game Modes

- **Survival** - Endless waves, earn XP, unlock perks
- **Rush** - Fast-paced with constant enemy streams

## Features

- 25 weapons (pistols, shotguns, SMGs, rifles, rockets, plasma, flames)
- 14 enemy types (zombies, spiders, aliens, lizards, bosses)
- 30+ perks with synergies
- Powerups (nukes, freeze, shields, speed boost)
- Blood decals and particle effects
- High score tracking
