export type ScoreEntryMode = 'total' | 'dart';

const SCORE_ENTRY_MODE_KEY = 'tdarts-board-score-entry-mode';
const SCORE_PREVIEW_ON_CARDS_KEY = 'tdarts-board-score-preview-on-cards';

export function getStoredScoreEntryMode(): ScoreEntryMode {
  if (typeof window === 'undefined') return 'total';
  return sessionStorage.getItem(SCORE_ENTRY_MODE_KEY) === 'dart' ? 'dart' : 'total';
}

export function setStoredScoreEntryMode(mode: ScoreEntryMode): void {
  sessionStorage.setItem(SCORE_ENTRY_MODE_KEY, mode);
}

/** When true, visit / remaining preview is shown on the active player card (not under the input bar). */
export function getStoredScorePreviewOnCards(): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(SCORE_PREVIEW_ON_CARDS_KEY) !== 'false';
}

export function setStoredScorePreviewOnCards(enabled: boolean): void {
  sessionStorage.setItem(SCORE_PREVIEW_ON_CARDS_KEY, enabled ? 'true' : 'false');
}
