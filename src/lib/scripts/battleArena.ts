import type { GameState, PowerUp, BattleResult } from '../types/powerups.ts';
import { initializeGameState, spawnRandomPowerUp, collectPowerUp, checkExpiredPowerUps } from '../utils/powerupManager.ts';
import { calculateBattleResult } from '../utils/battleCalculation.ts';
import { POWERUP_CONFIGS, SPAWN_CONFIG } from '../config/powerups.ts';
import { saveMatchResult } from '../utils/matchHistory.ts';

// Global game state - single source of truth
let gameState: GameState = initializeGameState();

// Battle context for managing intervals
const battleContext = {
  spawnIntervalId: null as number | null,
  expiryIntervalId: null as number | null,
  observerIntervalId: null as number | null,
  isBattleActive: false,
};

// DOM elements
const battleButton = document.getElementById('battle-button') as HTMLButtonElement;
const player1Input = document.getElementById('player1') as HTMLInputElement;
const player2Input = document.getElementById('player2') as HTMLInputElement;
const resultsSection = document.getElementById('results-section') as HTMLElement;
const loadingMessage = document.getElementById('loading-message') as HTMLElement;
const winnerMessage = document.getElementById('winner-message') as HTMLElement;
const errorMessage = document.getElementById('error-message') as HTMLElement;
const battleArena = document.getElementById('battle-arena') as HTMLElement;
const gameOverOverlay = document.getElementById('game-over-overlay') as HTMLElement;
const gameOverTitle = document.getElementById('game-over-title') as HTMLElement;
const gameOverMessage = document.getElementById('game-over-message') as HTMLElement;
const gameOverPlayers = document.getElementById('game-over-players') as HTMLElement;
const gameOverScore = document.getElementById('game-over-score') as HTMLElement;
const gameOverClose = document.getElementById('game-over-close') as HTMLButtonElement;

// Game State Observer - polls for changes and updates UI
class GameStateObserver {
  private previousActiveCount = 0;

  startWatching() {
    this.stopWatching();
    battleContext.observerIntervalId = window.setInterval(() => {
      this.checkForChanges();
    }, 100);
  }

  stopWatching() {
    if (battleContext.observerIntervalId) {
      window.clearInterval(battleContext.observerIntervalId);
      battleContext.observerIntervalId = null;
    }
  }

  private checkForChanges() {
    const currentCount = gameState.activePowerUps.size;
    if (currentCount !== this.previousActiveCount) {
      this.previousActiveCount = currentCount;
      syncBadgesWithState();
    }
  }
}

const observer = new GameStateObserver();

function setupPage() {
  observer.startWatching();
  if (battleButton) {
    battleButton.addEventListener('click', startBattle);
  }
  if (gameOverClose) {
    gameOverClose.addEventListener('click', hideGameOverScreen);
  }
}

function resetBattleState() {
  if (battleContext.spawnIntervalId) {
    window.clearInterval(battleContext.spawnIntervalId);
    battleContext.spawnIntervalId = null;
  }
  if (battleContext.expiryIntervalId) {
    window.clearInterval(battleContext.expiryIntervalId);
    battleContext.expiryIntervalId = null;
  }

  gameState = initializeGameState();
  battleContext.isBattleActive = false;

  clearPowerUpElements();
  document.getElementById('player1-badges')!.innerHTML = '';
  document.getElementById('player2-badges')!.innerHTML = '';
  winnerMessage.style.display = 'none';
  hideGameOverScreen();
}

function syncBadgesWithState() {
  const player1BadgeContainer = document.getElementById('player1-badges')!;
  const player2BadgeContainer = document.getElementById('player2-badges')!;
  player1BadgeContainer.innerHTML = '';
  player2BadgeContainer.innerHTML = '';

  const activePowerUps = Array.from(gameState.activePowerUps.values());
  activePowerUps.forEach(powerUp => {
    if (!powerUp.collected) return;
    const config = POWERUP_CONFIGS[powerUp.type];
    const timeRemaining = powerUp.expiresAt ? Math.ceil((powerUp.expiresAt - Date.now()) / 1000) : 0;
    const badgeHTML = `
      <div class="badge badge-${powerUp.type}" data-powerup-id="${powerUp.id}">
        <span class="badge-icon">${config.emoji}</span>
        <span class="badge-timer">${timeRemaining}s</span>
      </div>
    `;
    player1BadgeContainer.insertAdjacentHTML('beforeend', badgeHTML);
    player2BadgeContainer.insertAdjacentHTML('beforeend', badgeHTML);
  });
}

function renderPowerUpElements() {
  clearPowerUpElements();
  const activePowerUps = Array.from(gameState.activePowerUps.values());
  document.getElementById('active-count')!.textContent = activePowerUps.length.toString();

  activePowerUps.forEach(powerUp => {
    if (powerUp.collected) return;
    const config = POWERUP_CONFIGS[powerUp.type];
    const element = document.createElement('div');
    element.className = `powerup-element powerup-${powerUp.type}`;
    element.dataset.powerupId = powerUp.id;
    element.textContent = config.emoji;
    element.style.left = `${powerUp.position.x}%`;
    element.style.top = `${powerUp.position.y}%`;
    element.addEventListener('click', () => handlePowerUpClick(powerUp.id));
    battleArena.appendChild(element);
  });
}

function clearPowerUpElements() {
  const elements = battleArena.querySelectorAll('.powerup-element');
  elements.forEach(el => el.remove());
  document.getElementById('active-count')!.textContent = '0';
}

function handlePowerUpClick(powerUpId: string) {
  const success = collectPowerUp(gameState, powerUpId);
  if (success) {
    const element = battleArena.querySelector(`[data-powerup-id="${powerUpId}"]`);
    if (element) {
      element.classList.add('collected');
      setTimeout(() => element.remove(), 500);
    }
  }
}

function startPowerUpSpawning() {
  if (!battleContext.isBattleActive) return;
  console.log('[PowerUp] Starting spawn loop');
  const initialPowerUp = spawnRandomPowerUp(gameState);
  if (initialPowerUp) {
    renderPowerUpElements();
  }
  battleContext.spawnIntervalId = window.setInterval(() => {
    if (!battleContext.isBattleActive) return;
    const newPowerUp = spawnRandomPowerUp(gameState);
    if (newPowerUp) {
      renderPowerUpElements();
    }
  }, SPAWN_CONFIG.intervalMs);
}

function startExpiryChecking() {
  battleContext.expiryIntervalId = window.setInterval(() => {
    const expiredCount = checkExpiredPowerUps(gameState);
    if (expiredCount > 0) {
      renderPowerUpElements();
    }
  }, 500);
}

async function fetchContributions(username: string) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    user: username,
    total: Math.floor(Math.random() * 1000) + 500,
    contributions: Array.from({ length: 365 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 10),
      level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4,
    })),
  };
}

function renderContributionGrid(gridElement: HTMLElement, contributions: any[]) {
  gridElement.innerHTML = '';
  contributions.slice(0, 365).forEach(contrib => {
    const dayElement = document.createElement('div');
    dayElement.className = `contribution-day level-${contrib.level}`;
    dayElement.title = `${contrib.date}: ${contrib.count} contributions`;
    gridElement.appendChild(dayElement);
  });
}

async function startBattle() {
  const player1 = player1Input.value.trim();
  const player2 = player2Input.value.trim();

  if (!player1 || !player2) {
    showError('Please enter both usernames');
    return;
  }

  resetBattleState();
  hideError();
  showLoading();

  try {
    const [data1, data2] = await Promise.all([
      fetchContributions(player1),
      fetchContributions(player2),
    ]);

    document.getElementById('player1-name')!.textContent = data1.user;
    document.getElementById('player1-stats')!.textContent = `${data1.total} contributions`;
    renderContributionGrid(document.getElementById('player1-grid')!, data1.contributions);

    document.getElementById('player2-name')!.textContent = data2.user;
    document.getElementById('player2-stats')!.textContent = `${data2.total} contributions`;
    renderContributionGrid(document.getElementById('player2-grid')!, data2.contributions);

    battleContext.isBattleActive = true;
    startPowerUpSpawning();
    startExpiryChecking();

    window.setTimeout(() => {
      const result = calculateBattleResult(data1.contributions, data2.contributions, gameState);
      displayWinner(result);
      showGameOverScreen(result);
      battleContext.isBattleActive = false;
      if (battleContext.spawnIntervalId) {
        window.clearInterval(battleContext.spawnIntervalId);
        battleContext.spawnIntervalId = null;
      }
      if (battleContext.expiryIntervalId) {
        window.clearInterval(battleContext.expiryIntervalId);
        battleContext.expiryIntervalId = null;
      }
    }, 8000);
  } catch (error) {
    showError('Failed to load contribution data. Please try again.');
    console.error('Battle error:', error);
  } finally {
    hideLoading();
  }
}

function displayWinner(result: BattleResult) {
  const player1NameElement = document.getElementById('player1-name') as HTMLElement;
  const player2NameElement = document.getElementById('player2-name') as HTMLElement;
  const winnerElement = result.winner === 1 ? player1NameElement : player2NameElement;

  player1NameElement.textContent = player1Input.value.trim() || 'Player 1';
  player2NameElement.textContent = player2Input.value.trim() || 'Player 2';
  winnerElement.textContent += ' 🏆';

  document.getElementById('player1-stats')!.textContent = `${result.score1} points`;
  document.getElementById('player2-stats')!.textContent = `${result.score2} points`;

  winnerMessage.textContent = `${result.winner === 1 ? player1NameElement.textContent : player2NameElement.textContent} wins!`;
  winnerMessage.style.display = 'block';

  saveMatchResult({
    id: `match-${Date.now()}`,
    player1: player1Input.value.trim() || 'Player 1',
    player2: player2Input.value.trim() || 'Player 2',
    score1: result.score1,
    score2: result.score2,
    winner: result.winner,
    timestamp: Date.now(),
  });
}

function showLoading() {
  loadingMessage.style.display = 'block';
  resultsSection.style.display = 'none';
  if (battleButton) battleButton.disabled = true;
  winnerMessage.style.display = 'none';
}

function hideLoading() {
  loadingMessage.style.display = 'none';
  resultsSection.style.display = 'block';
  if (battleButton) battleButton.disabled = false;
}

function showError(message: string) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function hideError() {
  errorMessage.style.display = 'none';
}

function showGameOverScreen(result: BattleResult) {
  const player1Name = player1Input.value.trim() || 'Player 1';
  const player2Name = player2Input.value.trim() || 'Player 2';
  const winnerName = result.winner === 1 ? player1Name : player2Name;
  const message = result.score1 === result.score2 ? 'It’s a draw!' : `${winnerName} wins!`;

  gameOverTitle.textContent = 'Game Over';
  gameOverMessage.textContent = message;
  gameOverPlayers.textContent = `${player1Name} vs ${player2Name}`;
  gameOverScore.textContent = `${result.score1} – ${result.score2}`;
  gameOverOverlay.style.display = 'flex';
}

function hideGameOverScreen() {
  if (gameOverOverlay) {
    gameOverOverlay.style.display = 'none';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPage);
} else {
  setupPage();
}
