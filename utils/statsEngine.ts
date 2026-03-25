/**
 * Stats computation engine.
 * Computes per-player and per-team aggregates from the game data.
 */

import type { Game, TeamDef } from './types';

export interface PlayerStats {
  /** Serves that directly win the point (opponent fails to return or only manages one touch) */
  aces: number;
  /** Serves that lose the point without the opponent touching the ball (e.g. into the net / out) */
  failedServes: number;
  /** player/team was the victim of an ace (failed to return a serve) */
  aced: number;
  /** First pass after a serve (serve receive, rally index 1 touch index 0) */
  receptions: number;
  /** Last touch of a rally that wins the point (excluding serves) */
  kills: number;
  /** Last touch of a rally that loses the point (e.g. attack into the net / out) */
  attackErrors: number;
  /** Touches that cross the net, excluding serves and passes (last touch of a rally that is not serve/pass) */
  attacks: number;
  /** Failed passes (isFail) that are NOT receives (excludes first touch after a cross-net hit) */
  passErrors: number;
  /** All touches of type 'pass' (both receives and in-rally passes) */
  passCount: number;
  /** All touches of type 'set' or 'option' (second contact to set up an attack) */
  setCount: number;
  /** Touches of type 'block' (contact at the net after an opponent attack) */
  blockCount: number;
  /** Points where this player's touch was marked isScoring / team won the point */
  pointsWon: number;
  /** Points where this player's touch was marked isFail / team lost the point */
  pointsLost: number;
}

export const emptyStats = (): PlayerStats => ({
  aces: 0, failedServes: 0, aced: 0, receptions: 0, kills: 0, attackErrors: 0, attacks: 0, passErrors: 0,
  passCount: 0, setCount: 0, blockCount: 0, pointsWon: 0, pointsLost: 0,
});

export const STAT_LABELS: { key: keyof PlayerStats; label: string; polarity: 'positive' | 'negative' | 'neutral' }[] = [
  { key: 'aces', label: 'Aces', polarity: 'positive' },
  { key: 'failedServes', label: 'Failed Serves', polarity: 'negative' },
  { key: 'aced', label: 'Aced', polarity: 'negative' },
  { key: 'receptions', label: 'Receptions', polarity: 'neutral' },
  { key: 'kills', label: 'Kills', polarity: 'positive' },
  { key: 'attackErrors', label: 'Attack Errors', polarity: 'negative' },
  { key: 'attacks', label: 'Attacks', polarity: 'neutral' },
  { key: 'passErrors', label: 'Pass Errors', polarity: 'negative' },
  { key: 'passCount', label: 'Passes', polarity: 'neutral' },
  { key: 'setCount', label: 'Sets', polarity: 'neutral' },
  { key: 'blockCount', label: 'Blocks', polarity: 'positive' },
  { key: 'pointsWon', label: 'Points Won', polarity: 'positive' },
  { key: 'pointsLost', label: 'Points Lost', polarity: 'negative' },
];

export const computeStats = (game: Game, fromPoint?: number, toPoint?: number) => {
  const playerStats: Record<string, PlayerStats> = {};
  const teamStats: Record<string, PlayerStats> = {};

  for (const t of game.teams) {
    teamStats[t.id] = emptyStats();
    for (const pid of t.playerIds) playerStats[pid] = emptyStats();
  }

  const start = fromPoint ?? 0;
  const end = toPoint ?? game.points.length;

  for (let pi = start; pi < end; pi++) {
    const point = game.points[pi];
    if (!point.wonByTeamId || !point.rallies.length) continue;

    const winnerId = point.wonByTeamId;
    const winningTeam = game.teams.find((t: TeamDef) => t.id === winnerId);
    const losingTeam = game.teams.find((t: TeamDef) => t.id !== winnerId);

    // Points won/lost per team
    if (winningTeam) {
      teamStats[winningTeam.id].pointsWon++;
    }
    if (losingTeam) {
      teamStats[losingTeam.id].pointsLost++;
    }

    // Points won/lost per player (individual contribution via isScoring / isFail)
    for (const rally of point.rallies) {
      for (const touch of rally.touches) {
        if (!touch.playerId) continue;
        const ps = playerStats[touch.playerId];
        if (!ps) continue;
        if (touch.isScoring) ps.pointsWon++;
        if (touch.isFail) ps.pointsLost++;
      }
    }

    // Service analysis
    const servRally = point.rallies[0];
    if (!servRally?.touches.length) continue;
    const serveTouch = servRally.touches[0];
    const servPlayerId = serveTouch.playerId;
    const servTeamId = servRally.teamId;
    if (!servPlayerId) continue;

    const isServWon = winnerId === servTeamId;
    const recvRally = point.rallies.length > 1 ? point.rallies[1] : null;

    // Ace
    if (isServWon && point.rallies.length <= 2 && (!recvRally || recvRally.touches.length <= 1)) {
      if (playerStats[servPlayerId]) playerStats[servPlayerId].aces++;
      if (teamStats[servTeamId]) teamStats[servTeamId].aces++;

      // Aced
      if (recvRally?.touches.length) {
        const recvId = recvRally.touches[0].playerId;
        const recvTeam = recvRally.teamId;
        if (recvId && playerStats[recvId]) playerStats[recvId].aced++;
        if (teamStats[recvTeam]) teamStats[recvTeam].aced++;
      } else if (losingTeam) {
        teamStats[losingTeam.id].aced++;
      }
    }

    // Failed serve
    if (!isServWon && (!recvRally || (servRally.touches.length === 1 && serveTouch.isFail))) {
      if (playerStats[servPlayerId]) playerStats[servPlayerId].failedServes++;
      if (teamStats[servTeamId]) teamStats[servTeamId].failedServes++;
    }

    // Count touches per type
    for (let ri = 0; ri < point.rallies.length; ri++) {
      const rally = point.rallies[ri];
      for (let ti = 0; ti < rally.touches.length; ti++) {
        const touch = rally.touches[ti];
        if (!touch.playerId) continue;
        const ps = playerStats[touch.playerId];
        const ts = teamStats[rally.teamId];
        const isReception = ri === 1 && ti === 0; // first touch after serve specifically
        if (touch.type === 'pass') {
          if (ps) ps.passCount++;
          if (ts) ts.passCount++;
          // Reception: pass immediately after the serve
          if (isReception) {
            if (ps) ps.receptions++;
            if (ts) ts.receptions++;
          }
          // Pass error: failed pass that is NOT a serve reception
          if (touch.isFail && !isReception) {
            if (ps) ps.passErrors++;
            if (ts) ts.passErrors++;
          }
        }
        if (touch.type === 'set' || touch.type === 'option') {
          if (ps) ps.setCount++;
          if (ts) ts.setCount++;
        }
        if (touch.type === 'block') {
          if (ps) ps.blockCount++;
          if (ts) ts.blockCount++;
        }
      }
    }

    // Last touch analysis
    const lastRally = point.rallies[point.rallies.length - 1];
    const lastTouch = lastRally?.touches[lastRally.touches.length - 1];
    if (lastTouch?.playerId && lastTouch.type !== 'serve') {
      const pid = lastTouch.playerId;
      const tid = lastRally.teamId;
      if (winnerId === tid) {
        if (playerStats[pid]) playerStats[pid].kills++;
        if (teamStats[tid]) teamStats[tid].kills++;
      } else {
        if (playerStats[pid]) playerStats[pid].attackErrors++;
        if (teamStats[tid]) teamStats[tid].attackErrors++;
      }
    }

    // Attacks: last touch of each rally that crosses the net, not a serve or pass
    for (const rally of point.rallies) {
      if (!rally.touches.length) continue;
      const last = rally.touches[rally.touches.length - 1];
      if (!last.playerId) continue;
      if (last.type === 'serve' || last.type === 'pass') continue;
      const ps = playerStats[last.playerId];
      const ts = teamStats[rally.teamId];
      if (ps) ps.attacks++;
      if (ts) ts.attacks++;
    }
  }

  return { playerStats, teamStats };
};

