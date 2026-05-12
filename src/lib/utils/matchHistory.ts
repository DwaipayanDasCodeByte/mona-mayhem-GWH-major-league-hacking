export interface MatchHistoryRecord {
  id: string;
  player1: string;
  player2: string;
  score1: number;
  score2: number;
  winner: 1 | 2;
  timestamp: number;
}

const HISTORY_KEY = 'mona-mayhem-match-history';
const MAX_HISTORY_RECORDS = 50;

function parseHistory(raw: string | null): MatchHistoryRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        ...item,
        timestamp: Number(item.timestamp) || Date.now(),
      })) as MatchHistoryRecord[];
    }
  } catch {
    return [];
  }
  return [];
}

export function loadMatchHistory(): MatchHistoryRecord[] {
  if (typeof window === 'undefined') {
    console.log('[MatchHistory] loadMatchHistory called on server, returning empty array');
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    console.log('[MatchHistory] Raw data from localStorage:', raw);
    const history = parseHistory(raw);
    console.log('[MatchHistory] Parsed history:', history.length, 'records');
    return history;
  } catch (error) {
    console.error('[MatchHistory] Error loading match history:', error);
    return [];
  }
}

export function saveMatchResult(record: MatchHistoryRecord): void {
  if (typeof window === 'undefined') {
    console.log('[MatchHistory] saveMatchResult called on server, ignoring');
    return;
  }

  try {
    console.log('[MatchHistory] Saving match result:', record);
    const history = loadMatchHistory();
    const updated = [record, ...history].slice(0, MAX_HISTORY_RECORDS);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    console.log('[MatchHistory] Saved', updated.length, 'total records');
  } catch (error) {
    console.error('[MatchHistory] Error saving match result:', error);
  }
}

export function clearMatchHistory(): void {
  if (typeof window === 'undefined') {
    console.log('[MatchHistory] clearMatchHistory called on server, ignoring');
    return;
  }

  try {
    console.log('[MatchHistory] Clearing match history');
    window.localStorage.removeItem(HISTORY_KEY);
    console.log('[MatchHistory] Match history cleared');
  } catch (error) {
    console.error('[MatchHistory] Error clearing match history:', error);
  }
}
