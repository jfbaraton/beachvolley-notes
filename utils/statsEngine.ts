/**
 * Stats computation engine.
 * Computes per-player and per-team aggregates from the game data.
 */

import type { Game, TeamDef } from './types';

export interface PlayerStats {
  aces: number;
  failedServes: number;
  aced: number;
  kills: number;
  attackErrors: number;
  digs: number;
  passCount: number;
  setCount: number;
  groundHits: number;
  pointsWon: number;
  pointsLost: number;
}

export const emptyStats = (): PlayerStats => ({
  aces: 0, failedServes: 0, aced: 0, kills: 0, attackErrors: 0,
  digs: 0, passCount: 0, setCount: 0, groundHits: 0, pointsWon: 0, pointsLost: 0,
});

export const STAT_LABELS: { key: keyof PlayerStats; label: string }[] = [
  { key: 'aces', label: 'Aces' },
  { key: 'failedServes', label: 'Failed Serves' },
  { key: 'aced', label: 'Aced' },
  { key: 'kills', label: 'Kills' },
  { key: 'attackErrors', label: 'Attack Errors' },
  { key: 'digs', label: 'Digs' },
  { key: 'passCount', label: 'Passes' },
  { key: 'setCount', label: 'Sets' },
  { key: 'groundHits', label: 'Ground Hits' },
  { key: 'pointsWon', label: 'Points Won' },
  { key: 'pointsLost', label: 'Points Lost' },
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

    // Points won/lost per player
    if (winningTeam) {
      for (const pid of winningTeam.playerIds) {
        if (playerStats[pid]) playerStats[pid].pointsWon++;
      }
      teamStats[winningTeam.id].pointsWon++;
    }
    if (losingTeam) {
      for (const pid of losingTeam.playerIds) {
        if (playerStats[pid]) playerStats[pid].pointsLost++;
      }
      teamStats[losingTeam.id].pointsLost++;
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
    for (const rally of point.rallies) {
      for (const touch of rally.touches) {
        if (!touch.playerId) {
          // Ground hit
          if (teamStats[rally.teamId]) teamStats[rally.teamId].groundHits++;
          continue;
        }
        const ps = playerStats[touch.playerId];
        const ts = teamStats[rally.teamId];
        if (touch.type === 'pass') {
          if (ps) ps.passCount++;
          if (ts) ts.passCount++;
          // Dig = successful pass after an attack
        }
        if (touch.type === 'set') {
          if (ps) ps.setCount++;
          if (ts) ts.setCount++;
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

