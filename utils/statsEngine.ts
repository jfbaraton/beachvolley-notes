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
  /** Last touch of a rally that wins the point (excluding serves) */
  kills: number;
  /** Last touch of a rally that loses the point (e.g. attack into the net / out) */
  attackErrors: number;
  /** Failed passes (isFail) that are NOT receives (excludes first touch after a cross-net hit) */
  passErrors: number;
  /** Touches of type 'block' (contact at the net after an opponent attack) */
  blockCount: number;
  /** First touch after the ball crosses the net (receive / defensive pass, rallyIdx > 0 & touchIdx 0) */
  digs: number;
  /** All touches of type 'pass' (both receives and in-rally passes) */
  passCount: number;
  /** All touches of type 'set' or 'option' (second contact to set up an attack) */
  setCount: number;
  /** Ball hitting the ground (no player contact) */
  groundHits: number;
  /** Points where this player's touch was marked isScoring / team won the point */
  pointsWon: number;
  /** Points where this player's touch was marked isFail / team lost the point */
  pointsLost: number;
}

export const emptyStats = (): PlayerStats => ({
  aces: 0, failedServes: 0, aced: 0, kills: 0, attackErrors: 0, passErrors: 0,
  blockCount: 0, digs: 0, passCount: 0, setCount: 0, groundHits: 0, pointsWon: 0, pointsLost: 0,
});

export const STAT_LABELS: { key: keyof PlayerStats; label: string; polarity: 'positive' | 'negative' | 'neutral' }[] = [
  { key: 'aces', label: 'Aces', polarity: 'positive' },
  { key: 'failedServes', label: 'Failed Serves', polarity: 'negative' },
  { key: 'aced', label: 'Aced', polarity: 'negative' },
  { key: 'kills', label: 'Kills', polarity: 'positive' },
  { key: 'attackErrors', label: 'Attack Errors', polarity: 'negative' },
  { key: 'passErrors', label: 'Pass Errors', polarity: 'negative' },
  { key: 'blockCount', label: 'Blocks', polarity: 'positive' },
  { key: 'digs', label: 'Digs', polarity: 'positive' },
  { key: 'passCount', label: 'Passes', polarity: 'neutral' },
  { key: 'setCount', label: 'Sets', polarity: 'neutral' },
  { key: 'groundHits', label: 'Ground Hits', polarity: 'neutral' },
  { key: 'pointsWon', label: 'Points Won', polarity: 'positive' },
  { key: 'pointsLost', label: 'Points Lost', polarity: 'negative' },
];

export const computeStats = (game: Game) => {
  const playerStats: Record<string, PlayerStats> = {};
  const teamStats: Record<string, PlayerStats> = {};

  for (const t of game.teams) {
    teamStats[t.id] = emptyStats();
    for (const pid of t.playerIds) playerStats[pid] = emptyStats();
  }

  for (const point of game.points) {
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
        if (!touch.playerId) {
          // Ground hit
          if (teamStats[rally.teamId]) teamStats[rally.teamId].groundHits++;
          continue;
        }
        const ps = playerStats[touch.playerId];
        const ts = teamStats[rally.teamId];
        const isReceive = ri > 0 && ti === 0; // first touch after cross-net = receive
        if (touch.type === 'pass') {
          if (ps) ps.passCount++;
          if (ts) ts.passCount++;
          // Pass error: failed pass that is NOT a receive
          if (touch.isFail && !isReceive) {
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
        if (touch.type === 'ground') {
          if (ps) ps.groundHits++;
          if (ts) ts.groundHits++;
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

    // Digs: count passes after cross-net touches (rally index > 0)
    for (let ri = 1; ri < point.rallies.length; ri++) {
      const r = point.rallies[ri];
      if (r.touches.length > 0 && r.touches[0].type === 'pass' && r.touches[0].playerId) {
        if (playerStats[r.touches[0].playerId]) playerStats[r.touches[0].playerId].digs++;
        if (teamStats[r.teamId]) teamStats[r.teamId].digs++;
      }
    }
  }

  return { playerStats, teamStats };
};

