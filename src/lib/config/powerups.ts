// Power-Up configuration for Mona Mayhem Battle Arena

import type { PowerUpEffect } from '../types/powerups.ts';

// Power-up effect definitions
export const POWERUP_CONFIGS: Record<string, PowerUpEffect> = {
  speedBoost: {
    type: 'speedBoost',
    durationMs: 5000, // 5 seconds
    modifier: 1.5, // 50% faster animation
    emoji: '⚡',
    color: '#5fed83', // green
  },
  shield: {
    type: 'shield',
    durationMs: 5000, // 5 seconds
    modifier: 0.2, // 20% damage reduction
    emoji: '🛡️',
    color: '#8a2be2', // purple
  },
  health: {
    type: 'health',
    durationMs: 5000, // 5 seconds
    modifier: 0.3, // 30% contribution boost
    emoji: '❤️',
    color: '#ff6b6b', // red
  },
};

// Spawn configuration
export const SPAWN_CONFIG = {
  intervalMs: 1500, // spawn every 1.5 seconds for better visibility
  maxActivePowerUps: 5, // maximum simultaneous active power-ups
  arenaBounds: {
    minX: 10, // 10% from left edge
    maxX: 90, // 90% from left edge
    minY: 20, // 20% from top
    maxY: 80, // 80% from top
  },
};

// Power-up spawn probabilities (weighted random selection)
export const SPAWN_WEIGHTS = {
  speedBoost: 40, // 40% chance
  shield: 30,     // 30% chance
  health: 30,     // 30% chance
} as const;