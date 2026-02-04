export enum ProjectileType {
  BULLET = 0,
  PLASMA = 2,
  FLAME = 4
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
    name: 'Shotgun',
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
  }
];

export function getWeaponById(id: number): WeaponData | undefined {
  return WEAPONS.find(w => w.id === id);
}

export function getWeaponByIndex(index: number): WeaponData {
  return WEAPONS[index] || WEAPONS[0];
}
