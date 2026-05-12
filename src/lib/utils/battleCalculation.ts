// Battle Calculation: Apply power-up effects to contribution scores

import type { GameState, BattleResult, PowerUp } from '../types/powerups.ts';
import { POWERUP_CONFIGS } from '../config/powerups.ts';
import { getActivePowerUps } from './powerupManager.ts';

// Mock contribution data structure (should match actual API response)
export interface Contribution {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // GitHub's contribution levels
}

/**
 * Calculate total contribution score from contribution data
 */
function calculateContributions(contributions: Contribution[]): number {
  return contributions.reduce((total, contrib) => total + contrib.count, 0);
}

/**
 * Apply power-up effects to battle scores
 */
function applyPowerUpEffects(
  score1: number,
  score2: number,
  activePowerUps: PowerUp[]
): { score1: number; score2: number; appliedEffects: string[] } {
  let modifiedScore1 = score1;
  let modifiedScore2 = score2;
  const appliedEffects: string[] = [];

  activePowerUps.forEach(powerUp => {
    const config = POWERUP_CONFIGS[powerUp.type];
    const effect = config.modifier;

    switch (powerUp.type) {
      case 'shield':
        // Shield reduces the impact of the losing score (defensive buff)
        const minScore = Math.min(modifiedScore1, modifiedScore2);
        const shieldBonus = minScore * effect; // 20% of lower score
        if (modifiedScore1 < modifiedScore2) {
          modifiedScore1 += shieldBonus;
        } else {
          modifiedScore2 += shieldBonus;
        }
        appliedEffects.push(`Shield: +${Math.round(shieldBonus)} to trailing player`);
        break;

      case 'health':
        // Health boosts the leading score (offensive buff)
        const maxScore = Math.max(modifiedScore1, modifiedScore2);
        const healthBonus = maxScore * effect; // 30% of higher score
        if (modifiedScore1 > modifiedScore2) {
          modifiedScore1 += healthBonus;
        } else {
          modifiedScore2 += healthBonus;
        }
        appliedEffects.push(`Health: +${Math.round(healthBonus)} to leading player`);
        break;

      case 'speedBoost':
        // Speed Boost affects animation timing, not final calculation
        // This is handled in the UI layer during battle animation
        appliedEffects.push('Speed Boost: Faster battle animation');
        break;
    }
  });

  return { score1: modifiedScore1, score2: modifiedScore2, appliedEffects };
}

/**
 * Calculate the final battle result with power-up effects applied
 */
export function calculateBattleResult(
  player1Contributions: Contribution[],
  player2Contributions: Contribution[],
  gameState: GameState
): BattleResult {
  // Calculate base scores
  const baseScore1 = calculateContributions(player1Contributions);
  const baseScore2 = calculateContributions(player2Contributions);

  // Get currently active power-ups
  const activePowerUps = getActivePowerUps(gameState);

  // Apply power-up effects
  const { score1, score2, appliedEffects } = applyPowerUpEffects(
    baseScore1,
    baseScore2,
    activePowerUps
  );

  // Determine winner
  const winner = score1 > score2 ? 1 : score1 < score2 ? 2 : Math.random() > 0.5 ? 1 : 2;

  // Log applied effects for debugging
  if (appliedEffects.length > 0) {
    console.log('[Battle] Applied effects:', appliedEffects);
  }

  return {
    score1: Math.round(score1),
    score2: Math.round(score2),
    winner,
    activePowerUps, // include for UI display
  };
}

/**
 * Get the speed multiplier for battle animation based on active speed boosts
 */
export function getSpeedMultiplier(gameState: GameState): number {
  const activePowerUps = getActivePowerUps(gameState);
  const speedBoosts = activePowerUps.filter(p => p.type === 'speedBoost');

  if (speedBoosts.length === 0) {
    return 1.0; // normal speed
  }

  // Each speed boost multiplies the effect (stacking)
  return speedBoosts.reduce((multiplier, _) => multiplier * POWERUP_CONFIGS.speedBoost.modifier, 1.0);
}