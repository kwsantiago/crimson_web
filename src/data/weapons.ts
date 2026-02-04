export enum ProjectileType {
  BULLET = 0,
  PLASMA = 2,
  GAUSS = 3,
  FLAME = 4,
  ROCKET = 5,
  NUKE = 6,
  ION = 7,
  BLADE = 8,
  PULSE = 9,
  SHRINK = 10,
  SPLITTER = 11
}

export interface WeaponData {
  id: number;
  name: string;
  damage: number;
  fireRate: number;
  reloadTime: number;
  clipSize: number;
  pelletCount: number;
  spread: number;
  projectileSpeed: number;
  projectileType: ProjectileType;
}

export const WEAPONS: WeaponData[] = [
  {
    id: 0,
    name: 'Fire Bullets',
    damage: 30,
    fireRate: 0.14,
    reloadTime: 1.2,
    clipSize: 112,
    pelletCount: 1,
    spread: 0.22,
    projectileSpeed: 600,
    projectileType: ProjectileType.FLAME
  },
  {
    id: 1,
    name: 'Pistol',
    damage: 12,
    fireRate: 0.14,
    reloadTime: 1.2,
    clipSize: 12,
    pelletCount: 1,
    spread: 0.22,
    projectileSpeed: 500,
    projectileType: ProjectileType.BULLET
  },
  {
    id: 2,
    name: 'Assault Rifle',
    damage: 5,
    fireRate: 0.05,
    reloadTime: 1.2,
    clipSize: 25,
    pelletCount: 1,
    spread: 0.09,
    projectileSpeed: 600,
    projectileType: ProjectileType.BULLET
  },
  {
    id: 3,
    name: 'Submachine Gun',
    damage: 4,
    fireRate: 0.035,
    reloadTime: 1.5,
    clipSize: 50,
    pelletCount: 1,
    spread: 0.16,
    projectileSpeed: 500,
    projectileType: ProjectileType.BULLET
  },
  {
    id: 4,
    name: 'Sawed-off Shotgun',
    damage: 8,
    fireRate: 0.85,
    reloadTime: 1.9,
    clipSize: 2,
    pelletCount: 12,
    spread: 0.27,
    projectileSpeed: 400,
    projectileType: ProjectileType.BULLET
  },
  {
    id: 5,
    name: 'Jackhammer',
    damage: 8,
    fireRate: 0.43,
    reloadTime: 1.9,
    clipSize: 12,
    pelletCount: 12,
    spread: 0.13,
    projectileSpeed: 400,
    projectileType: ProjectileType.BULLET
  },
  {
    id: 6,
    name: 'Flamethrower',
    damage: 2,
    fireRate: 0.022,
    reloadTime: 1.2,
    clipSize: 200,
    pelletCount: 1,
    spread: 0.08,
    projectileSpeed: 300,
    projectileType: ProjectileType.FLAME
  },
  {
    id: 7,
    name: 'Plasma Rifle',
    damage: 15,
    fireRate: 0.29,
    reloadTime: 1.2,
    clipSize: 30,
    pelletCount: 1,
    spread: 0.18,
    projectileSpeed: 450,
    projectileType: ProjectileType.PLASMA
  },
  {
    id: 8,
    name: 'Multi Plasma',
    damage: 8,
    fireRate: 0.31,
    reloadTime: 1.4,
    clipSize: 20,
    pelletCount: 3,
    spread: 0.32,
    projectileSpeed: 400,
    projectileType: ProjectileType.PLASMA
  },
  {
    id: 9,
    name: 'Plasma Minigun',
    damage: 6,
    fireRate: 0.062,
    reloadTime: 1.4,
    clipSize: 100,
    pelletCount: 1,
    spread: 0.32,
    projectileSpeed: 500,
    projectileType: ProjectileType.PLASMA
  },
  {
    id: 10,
    name: 'Gauss Gun',
    damage: 35,
    fireRate: 0.11,
    reloadTime: 1.3,
    clipSize: 30,
    pelletCount: 1,
    spread: 0.10,
    projectileSpeed: 800,
    projectileType: ProjectileType.GAUSS
  },
  {
    id: 11,
    name: 'Rocket Launcher',
    damage: 60,
    fireRate: 1.0,
    reloadTime: 2.0,
    clipSize: 4,
    pelletCount: 1,
    spread: 0.05,
    projectileSpeed: 350,
    projectileType: ProjectileType.ROCKET
  },
  {
    id: 12,
    name: 'Plasma Shotgun',
    damage: 10,
    fireRate: 0.8,
    reloadTime: 1.8,
    clipSize: 8,
    pelletCount: 8,
    spread: 0.25,
    projectileSpeed: 400,
    projectileType: ProjectileType.PLASMA
  },
  {
    id: 13,
    name: 'Rocket Minigun',
    damage: 40,
    fireRate: 0.15,
    reloadTime: 2.5,
    clipSize: 20,
    pelletCount: 1,
    spread: 0.15,
    projectileSpeed: 400,
    projectileType: ProjectileType.ROCKET
  },
  {
    id: 14,
    name: 'Ion Rifle',
    damage: 20,
    fireRate: 0.25,
    reloadTime: 1.5,
    clipSize: 25,
    pelletCount: 1,
    spread: 0.08,
    projectileSpeed: 600,
    projectileType: ProjectileType.ION
  },
  {
    id: 15,
    name: 'Ion Minigun',
    damage: 12,
    fireRate: 0.05,
    reloadTime: 1.8,
    clipSize: 80,
    pelletCount: 1,
    spread: 0.12,
    projectileSpeed: 550,
    projectileType: ProjectileType.ION
  },
  {
    id: 16,
    name: 'Ion Cannon',
    damage: 100,
    fireRate: 1.5,
    reloadTime: 3.0,
    clipSize: 5,
    pelletCount: 1,
    spread: 0.02,
    projectileSpeed: 700,
    projectileType: ProjectileType.ION
  },
  {
    id: 17,
    name: 'Ion Shotgun',
    damage: 15,
    fireRate: 0.9,
    reloadTime: 2.0,
    clipSize: 6,
    pelletCount: 6,
    spread: 0.20,
    projectileSpeed: 500,
    projectileType: ProjectileType.ION
  },
  {
    id: 18,
    name: 'Gauss Shotgun',
    damage: 25,
    fireRate: 0.7,
    reloadTime: 1.8,
    clipSize: 8,
    pelletCount: 5,
    spread: 0.15,
    projectileSpeed: 700,
    projectileType: ProjectileType.GAUSS
  },
  {
    id: 19,
    name: 'Plasma Cannon',
    damage: 80,
    fireRate: 1.2,
    reloadTime: 2.5,
    clipSize: 6,
    pelletCount: 1,
    spread: 0.05,
    projectileSpeed: 350,
    projectileType: ProjectileType.PLASMA
  },
  {
    id: 20,
    name: 'Blade Gun',
    damage: 45,
    fireRate: 0.4,
    reloadTime: 1.5,
    clipSize: 15,
    pelletCount: 1,
    spread: 0.0,
    projectileSpeed: 450,
    projectileType: ProjectileType.BLADE
  },
  {
    id: 21,
    name: 'Pulse Gun',
    damage: 8,
    fireRate: 0.08,
    reloadTime: 1.2,
    clipSize: 40,
    pelletCount: 1,
    spread: 0.20,
    projectileSpeed: 400,
    projectileType: ProjectileType.PULSE
  },
  {
    id: 22,
    name: 'Shrinkifier 5000',
    damage: 5,
    fireRate: 0.15,
    reloadTime: 2.0,
    clipSize: 30,
    pelletCount: 1,
    spread: 0.10,
    projectileSpeed: 350,
    projectileType: ProjectileType.SHRINK
  },
  {
    id: 23,
    name: 'Splitter Gun',
    damage: 20,
    fireRate: 0.5,
    reloadTime: 1.8,
    clipSize: 12,
    pelletCount: 1,
    spread: 0.08,
    projectileSpeed: 400,
    projectileType: ProjectileType.SPLITTER
  },
  {
    id: 24,
    name: 'Nuke Launcher',
    damage: 200,
    fireRate: 3.0,
    reloadTime: 4.0,
    clipSize: 1,
    pelletCount: 1,
    spread: 0.0,
    projectileSpeed: 250,
    projectileType: ProjectileType.NUKE
  }
];

export function getWeaponById(id: number): WeaponData | undefined {
  return WEAPONS.find(w => w.id === id);
}

export function getWeaponByIndex(index: number): WeaponData {
  return WEAPONS[index] || WEAPONS[1];
}
