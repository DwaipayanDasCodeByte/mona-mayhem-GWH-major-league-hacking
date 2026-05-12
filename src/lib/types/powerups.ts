// Power-Up system type definitions for Mona Mayhem Battle Arena

export type PowerUpType = 'speedBoost' | 'shield' | 'health';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  spawnedAt: number; // timestamp when power-up appeared on arena
  collectedAt?: number; // timestamp when player clicked it
  expiresAt?: number; // timestamp when effect expires
  position: {
    x: number; // percentage across arena (0-100)
    y: number; // percentage down arena (0-100)
  };
  collected: boolean;
}

export interface PowerUpEffect {
  type: PowerUpType;
  durationMs: number;
  modifier: number; // multiplier for effect strength
  emoji: string;
  color: string; // CSS color for visual styling
}

export interface GameState {
  activePowerUps: Map<string, PowerUp>; // id -> PowerUp
  powerUpQueue: PowerUp[]; // pending spawns
  lastSpawnTime: number;
  batchId: number; // increments each battle to track state freshness
}

export interface BattleResult {
  score1: number;
  score2: number;
  winner: 1 | 2;
  activePowerUps: PowerUp[]; // power-ups that affected this battle
}