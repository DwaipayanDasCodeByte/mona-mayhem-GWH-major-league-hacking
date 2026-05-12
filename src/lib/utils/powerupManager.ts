// Power-Up Manager: Core logic for spawning, collecting, and managing power-ups

import type { GameState, PowerUp, PowerUpType } from '../types/powerups.ts';
import { POWERUP_CONFIGS, SPAWN_CONFIG, SPAWN_WEIGHTS } from '../config/powerups';

/**
 * Initialize a fresh game state for a new battle
 */
export function initializeGameState(): GameState {
  return {
    activePowerUps: new Map(),
    powerUpQueue: [],
    lastSpawnTime: 0,
    batchId: Date.now(), // unique ID for this battle
  };
}

/**
 * Generate a random power-up type based on spawn weights
 */
function getRandomPowerUpType(): PowerUpType {
  const totalWeight = Object.values(SPAWN_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (const [type, weight] of Object.entries(SPAWN_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return type as PowerUpType;
    }
  }

  return 'speedBoost'; // fallback
}

/**
 * Generate random position within arena bounds
 */
function getRandomPosition() {
  const { minX, maxX, minY, maxY } = SPAWN_CONFIG.arenaBounds;
  return {
    x: Math.random() * (maxX - minX) + minX,
    y: Math.random() * (maxY - minY) + minY,
  };
}

/**
 * Check if we've reached the maximum number of active power-ups
 */
export function isMaxPowerUpCapReached(gameState: GameState): boolean {
  return gameState.activePowerUps.size >= SPAWN_CONFIG.maxActivePowerUps;
}

/**
 * Spawn a new random power-up and add it to the game state
 */
export function spawnRandomPowerUp(gameState: GameState): PowerUp | null {
  console.log(`[PowerUp] spawnRandomPowerUp called: active=${gameState.activePowerUps.size}, max=${SPAWN_CONFIG.maxActivePowerUps}`);
  if (isMaxPowerUpCapReached(gameState)) {
    console.log('[PowerUp] Max cap reached, cannot spawn');
    return null; // can't spawn more
  }

  const now = Date.now();
  const powerUp: PowerUp = {
    id: `powerup-${gameState.batchId}-${now}`,
    type: getRandomPowerUpType(),
    spawnedAt: now,
    position: getRandomPosition(),
    collected: false,
  };

  gameState.activePowerUps.set(powerUp.id, powerUp);
  gameState.lastSpawnTime = now;

  console.log(`[PowerUp] Spawned ${powerUp.type} at (${powerUp.position.x}%, ${powerUp.position.y}%)`);
  return powerUp;
}

/**
 * Handle player collecting a power-up
 */
export function collectPowerUp(gameState: GameState, powerUpId: string): boolean {
  const powerUp = gameState.activePowerUps.get(powerUpId);
  if (!powerUp || powerUp.collected) {
    return false; // already collected or invalid
  }

  const now = Date.now();
  const config = POWERUP_CONFIGS[powerUp.type];

  // Update the power-up in the state
  gameState.activePowerUps.set(powerUpId, {
    ...powerUp,
    collected: true,
    collectedAt: now,
    expiresAt: now + config.durationMs,
  });

  console.log(`[PowerUp] Collected ${powerUp.type}, expires in ${config.durationMs}ms`);
  return true;
}

/**
 * Check for and remove expired power-ups from the game state
 */
export function checkExpiredPowerUps(gameState: GameState): number {
  const now = Date.now();
  let expiredCount = 0;

  for (const [id, powerUp] of gameState.activePowerUps) {
    if (powerUp.expiresAt && powerUp.expiresAt <= now) {
      gameState.activePowerUps.delete(id);
      expiredCount++;
      console.log(`[PowerUp] Expired ${powerUp.type}`);
    }
  }

  return expiredCount;
}

/**
 * Get all currently active (collected but not expired) power-ups
 */
export function getActivePowerUps(gameState: GameState): PowerUp[] {
  const now = Date.now();
  return Array.from(gameState.activePowerUps.values()).filter(
    powerUp => powerUp.collected && (!powerUp.expiresAt || powerUp.expiresAt > now)
  );
}