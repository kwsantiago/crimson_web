export enum WeaponId {
  NONE = 0,
  PISTOL = 1,
  ASSAULT_RIFLE = 2,
  SHOTGUN = 3,
  SAWED_OFF_SHOTGUN = 4,
  SUBMACHINE_GUN = 5,
  GAUSS_GUN = 6,
  MEAN_MINIGUN = 7,
  FLAMETHROWER = 8,
  PLASMA_RIFLE = 9,
  MULTI_PLASMA = 10,
  PLASMA_MINIGUN = 11,
  ROCKET_LAUNCHER = 12,
  SEEKER_ROCKETS = 13,
  PLASMA_SHOTGUN = 14,
  BLOW_TORCH = 15,
  HR_FLAMER = 16,
  MINI_ROCKET_SWARMERS = 17,
  ROCKET_MINIGUN = 18,
  PULSE_GUN = 19,
  JACKHAMMER = 20,
  ION_RIFLE = 21,
  ION_MINIGUN = 22,
  ION_CANNON = 23,
  SHRINKIFIER_5K = 24,
  BLADE_GUN = 25,
  SPIDER_PLASMA = 26,
  EVIL_SCYTHE = 27,
  PLASMA_CANNON = 28,
  SPLITTER_GUN = 29,
  GAUSS_SHOTGUN = 30,
  ION_SHOTGUN = 31,
  FLAMEBURST = 32,
  RAYGUN = 33,
  UNKNOWN_34 = 34,
  UNKNOWN_35 = 35,
  UNKNOWN_36 = 36,
  UNKNOWN_37 = 37,
  UNKNOWN_38 = 38,
  UNKNOWN_39 = 39,
  UNKNOWN_40 = 40,
  PLAGUE_SPREADER_GUN = 41,
  BUBBLEGUN = 42,
  RAINBOW_GUN = 43,
  GRIM_WEAPON = 44,
  FIRE_BULLETS = 45,
  UNKNOWN_46 = 46,
  UNKNOWN_47 = 47,
  UNKNOWN_48 = 48,
  UNKNOWN_49 = 49,
  TRANSMUTATOR = 50,
  BLASTER_R_300 = 51,
  LIGHTNING_RIFLE = 52,
  NUKE_LAUNCHER = 53
}

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
  SPLITTER = 11,
  SEEKER = 12,
  SPIDER = 13,
  SCYTHE = 14,
  RAY = 15,
  PLAGUE = 16,
  BUBBLE = 17,
  RAINBOW = 18,
  GRIM = 19,
  TRANSMUTE = 20,
  BLASTER = 21,
  LIGHTNING = 22
}

export enum AmmoClass {
  BULLET = 0,
  FUEL = 1,
  ROCKET = 2,
  ENERGY = 3,
  ION = 4
}

export interface WeaponData {
  id: WeaponId;
  name: string;
  ammoClass: AmmoClass | null;
  clipSize: number;
  fireRate: number;
  reloadTime: number;
  spread: number;
  damageScale: number;
  pelletCount: number;
  projectileMeta: number;
  iconIndex: number;
  flags: number | null;
  projectileSpeed: number;
  projectileType: ProjectileType;
  damage: number;
}

function makeWeapon(
  id: WeaponId,
  name: string,
  ammoClass: AmmoClass | null,
  clipSize: number,
  shotCooldown: number,
  reloadTime: number,
  spreadHeatInc: number,
  iconIndex: number,
  flags: number | null,
  projectileMeta: number,
  damageScale: number,
  pelletCount: number,
  projectileType: ProjectileType,
  projectileSpeed: number
): WeaponData {
  const baseDamage = 10;
  return {
    id,
    name,
    ammoClass,
    clipSize,
    fireRate: shotCooldown,
    reloadTime,
    spread: spreadHeatInc,
    damageScale,
    pelletCount,
    projectileMeta,
    iconIndex,
    flags,
    projectileSpeed,
    projectileType,
    damage: Math.floor(baseDamage * damageScale)
  };
}

export const WEAPON_TABLE: WeaponData[] = [
  makeWeapon(WeaponId.PISTOL, 'Pistol', AmmoClass.BULLET, 12, 0.7117, 1.2, 0.22, 0, 5, 55, 4.1, 1, ProjectileType.BULLET, 500),
  makeWeapon(WeaponId.ASSAULT_RIFLE, 'Assault Rifle', AmmoClass.BULLET, 25, 0.117, 1.2, 0.09, 1, 1, 50, 1.0, 1, ProjectileType.BULLET, 600),
  makeWeapon(WeaponId.SHOTGUN, 'Shotgun', AmmoClass.BULLET, 12, 0.85, 1.9, 0.27, 2, 1, 60, 1.2, 12, ProjectileType.BULLET, 400),
  makeWeapon(WeaponId.SAWED_OFF_SHOTGUN, 'Sawed-off Shotgun', AmmoClass.BULLET, 12, 0.87, 1.9, 0.13, 3, 1, 45, 1.0, 12, ProjectileType.BULLET, 400),
  makeWeapon(WeaponId.SUBMACHINE_GUN, 'Submachine Gun', AmmoClass.BULLET, 30, 0.088117, 1.2, 0.082, 4, 5, 45, 1.0, 1, ProjectileType.BULLET, 500),
  makeWeapon(WeaponId.GAUSS_GUN, 'Gauss Gun', AmmoClass.BULLET, 6, 0.6, 1.6, 0.42, 5, 1, 215, 1.0, 1, ProjectileType.GAUSS, 800),
  makeWeapon(WeaponId.MEAN_MINIGUN, 'Mean Minigun', AmmoClass.BULLET, 120, 0.09, 4.0, 0.062, 6, 3, 45, 1.0, 1, ProjectileType.BULLET, 600),
  makeWeapon(WeaponId.FLAMETHROWER, 'Flamethrower', AmmoClass.FUEL, 30, 0.008113, 2.0, 0.015, 7, 8, 45, 1.0, 1, ProjectileType.FLAME, 300),
  makeWeapon(WeaponId.PLASMA_RIFLE, 'Plasma Rifle', AmmoClass.BULLET, 20, 0.2908117, 1.2, 0.182, 8, null, 30, 5.0, 1, ProjectileType.PLASMA, 450),
  makeWeapon(WeaponId.MULTI_PLASMA, 'Multi-Plasma', AmmoClass.BULLET, 8, 0.6208117, 1.4, 0.32, 9, null, 45, 1.0, 3, ProjectileType.PLASMA, 400),
  makeWeapon(WeaponId.PLASMA_MINIGUN, 'Plasma Minigun', AmmoClass.BULLET, 30, 0.11, 1.3, 0.097, 10, null, 35, 2.1, 1, ProjectileType.PLASMA, 500),
  makeWeapon(WeaponId.ROCKET_LAUNCHER, 'Rocket Launcher', AmmoClass.ROCKET, 5, 0.7408117, 1.2, 0.42, 11, 8, 45, 1.0, 1, ProjectileType.ROCKET, 350),
  makeWeapon(WeaponId.SEEKER_ROCKETS, 'Seeker Rockets', AmmoClass.ROCKET, 8, 0.3108117, 1.2, 0.32, 12, 8, 45, 1.0, 1, ProjectileType.SEEKER, 250),
  makeWeapon(WeaponId.PLASMA_SHOTGUN, 'Plasma Shotgun', AmmoClass.BULLET, 8, 0.48, 3.1, 0.11, 13, null, 45, 1.0, 14, ProjectileType.PLASMA, 400),
  makeWeapon(WeaponId.BLOW_TORCH, 'Blow Torch', AmmoClass.FUEL, 30, 0.006113, 1.5, 0.01, 14, 8, 45, 1.0, 1, ProjectileType.FLAME, 250),
  makeWeapon(WeaponId.HR_FLAMER, 'HR Flamer', AmmoClass.FUEL, 30, 0.0085, 1.8, 0.01, 15, 8, 45, 1.0, 1, ProjectileType.FLAME, 350),
  makeWeapon(WeaponId.MINI_ROCKET_SWARMERS, 'Mini-Rocket Swarmers', AmmoClass.ROCKET, 5, 1.8, 1.8, 0.12, 16, 8, 45, 1.0, 1, ProjectileType.ROCKET, 300),
  makeWeapon(WeaponId.ROCKET_MINIGUN, 'Rocket Minigun', AmmoClass.ROCKET, 16, 0.12, 1.8, 0.12, 17, 8, 45, 1.0, 1, ProjectileType.ROCKET, 400),
  makeWeapon(WeaponId.PULSE_GUN, 'Pulse Gun', AmmoClass.ENERGY, 16, 0.1, 0.1, 0.0, 18, 8, 20, 1.0, 1, ProjectileType.PULSE, 400),
  makeWeapon(WeaponId.JACKHAMMER, 'Jackhammer', AmmoClass.BULLET, 16, 0.14, 3.0, 0.16, 19, 1, 45, 1.0, 4, ProjectileType.BULLET, 400),
  makeWeapon(WeaponId.ION_RIFLE, 'Ion Rifle', AmmoClass.ION, 8, 0.4, 1.35, 0.112, 20, 8, 15, 3.0, 1, ProjectileType.ION, 600),
  makeWeapon(WeaponId.ION_MINIGUN, 'Ion Minigun', AmmoClass.ION, 20, 0.1, 1.8, 0.09, 21, 8, 20, 1.4, 1, ProjectileType.ION, 550),
  makeWeapon(WeaponId.ION_CANNON, 'Ion Cannon', AmmoClass.ION, 3, 1.0, 3.0, 0.68, 22, null, 10, 16.7, 1, ProjectileType.ION, 700),
  makeWeapon(WeaponId.SHRINKIFIER_5K, 'Shrinkifier 5k', AmmoClass.BULLET, 8, 0.21, 1.22, 0.04, 23, 8, 45, 0.0, 1, ProjectileType.SHRINK, 350),
  makeWeapon(WeaponId.BLADE_GUN, 'Blade Gun', AmmoClass.BULLET, 6, 0.35, 3.5, 0.04, 24, 8, 20, 11.0, 1, ProjectileType.BLADE, 450),
  makeWeapon(WeaponId.SPIDER_PLASMA, 'Spider Plasma', AmmoClass.BULLET, 5, 0.2, 1.2, 0.04, 25, 8, 10, 0.5, 1, ProjectileType.SPIDER, 400),
  makeWeapon(WeaponId.EVIL_SCYTHE, 'Evil Scythe', AmmoClass.ION, 3, 1.0, 3.0, 0.68, 25, null, 45, 1.0, 1, ProjectileType.SCYTHE, 350),
  makeWeapon(WeaponId.PLASMA_CANNON, 'Plasma Cannon', AmmoClass.BULLET, 3, 0.9, 2.7, 0.6, 25, null, 10, 28.0, 1, ProjectileType.PLASMA, 350),
  makeWeapon(WeaponId.SPLITTER_GUN, 'Splitter Gun', AmmoClass.BULLET, 6, 0.7, 2.2, 0.28, 28, null, 30, 6.0, 1, ProjectileType.SPLITTER, 400),
  makeWeapon(WeaponId.GAUSS_SHOTGUN, 'Gauss Shotgun', AmmoClass.BULLET, 4, 1.05, 2.1, 0.27, 30, 1, 45, 1.0, 6, ProjectileType.GAUSS, 700),
  makeWeapon(WeaponId.ION_SHOTGUN, 'Ion Shotgun', AmmoClass.ION, 10, 0.85, 1.9, 0.27, 31, 1, 45, 1.0, 8, ProjectileType.ION, 500),
  makeWeapon(WeaponId.FLAMEBURST, 'Flameburst', AmmoClass.ION, 60, 0.02, 3.0, 0.18, 29, null, 45, 1.0, 1, ProjectileType.FLAME, 400),
  makeWeapon(WeaponId.RAYGUN, 'RayGun', AmmoClass.ION, 12, 0.7, 2.0, 0.38, 30, null, 45, 1.0, 1, ProjectileType.RAY, 600),
  makeWeapon(WeaponId.PLAGUE_SPREADER_GUN, 'Plague Spreader Gun', null, 5, 0.2, 1.2, 0.04, 40, 8, 15, 0.0, 1, ProjectileType.PLAGUE, 350),
  makeWeapon(WeaponId.BUBBLEGUN, 'Bubblegun', null, 15, 0.1613, 1.2, 0.05, 41, 8, 45, 1.0, 1, ProjectileType.BUBBLE, 300),
  makeWeapon(WeaponId.RAINBOW_GUN, 'Rainbow Gun', null, 10, 0.2, 1.2, 0.09, 42, 8, 10, 1.0, 1, ProjectileType.RAINBOW, 400),
  makeWeapon(WeaponId.GRIM_WEAPON, 'Grim Weapon', null, 3, 0.5, 1.2, 0.4, 43, null, 45, 1.0, 1, ProjectileType.GRIM, 400),
  makeWeapon(WeaponId.FIRE_BULLETS, 'Fire Bullets', null, 112, 0.14, 1.2, 0.22, 44, 1, 60, 0.25, 1, ProjectileType.FLAME, 600),
  makeWeapon(WeaponId.TRANSMUTATOR, 'Transmutator', null, 50, 0.04, 5.0, 0.04, 49, 9, 45, 1.0, 1, ProjectileType.TRANSMUTE, 350),
  makeWeapon(WeaponId.BLASTER_R_300, 'Blaster R-300', null, 20, 0.08, 2.0, 0.05, 50, 9, 45, 1.0, 1, ProjectileType.BLASTER, 500),
  makeWeapon(WeaponId.LIGHTNING_RIFLE, 'Lightning Rifle', null, 500, 4.0, 8.0, 1.0, 51, 8, 45, 1.0, 1, ProjectileType.LIGHTNING, 800),
  makeWeapon(WeaponId.NUKE_LAUNCHER, 'Nuke Launcher', null, 1, 4.0, 8.0, 1.0, 52, 8, 45, 1.0, 1, ProjectileType.NUKE, 250)
];

const WEAPON_BY_ID: Map<WeaponId, WeaponData> = new Map();
for (const weapon of WEAPON_TABLE) {
  WEAPON_BY_ID.set(weapon.id, weapon);
}

export const WEAPONS: WeaponData[] = WEAPON_TABLE;

export function getWeaponById(id: WeaponId | number): WeaponData | undefined {
  return WEAPON_BY_ID.get(id as WeaponId);
}

export function getWeaponByIndex(index: number): WeaponData {
  return WEAPON_TABLE[index] || WEAPON_TABLE[0];
}
