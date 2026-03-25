/**
 * Pure game-logic engine — no SharedValues, no animations.
 * Operates on the plain Game data model from types.ts.
 */

import type {
  Game, TeamDef, Touch, Score, TouchIndex,
  FieldConstants, PlayerPos,
} from './types';

// ─── Constants ──────────────────────────────────────────

const TO_ACROSS_ANGLE = 45;
const FROM_ACROSS_ANGLE = 45;
const FROM_ACROSS_MIN_MOVE_FRAC = 1 / 8;

// ─── Helpers ────────────────────────────────────────────

export const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

const angleBetween = (ux: number, uy: number, vx: number, vy: number): number => {
  const mu = Math.sqrt(ux * ux + uy * uy);
  const mv = Math.sqrt(vx * vx + vy * vy);
  if (mu < 0.001 || mv < 0.001) return 0;
  const cos = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (mu * mv)));
  return Math.acos(cos) * (180 / Math.PI);
};

export const clampBall = (v: number, size: number, max: number) =>
  Math.min(Math.max(0, v - size / 2), max - size);

export const clampPlayer = (v: number, size: number, max: number) =>
  Math.min(Math.max(0, v - size / 2), max - size);

export const clampBallX = (x: number, fc: FieldConstants) => clampBall(x, fc.ballSize, fc.width);
export const clampBallY = (y: number, fc: FieldConstants) => clampBall(y, fc.ballSize, fc.height);
export const clampPlayerX = (x: number, fc: FieldConstants) => clampPlayer(x, fc.playerSize, fc.width);
export const clampPlayerY = (y: number, fc: FieldConstants) => clampPlayer(y, fc.playerSize, fc.height);

// ─── Team / Player lookups ──────────────────────────────

export const otherTeam = (game: Game, teamId: string): TeamDef =>
  game.teams.find((t: TeamDef) => t.id !== teamId) || game.teams[0];

export const otherPlayerId = (team: TeamDef, playerId: string): string =>
  team.playerIds.find((id: string) => id !== playerId) || team.playerIds[0];

export const teamOfPlayer = (game: Game, playerId: string): TeamDef =>
  game.teams.find((t: TeamDef) => t.playerIds.includes(playerId)) || game.teams[0];

export const teamById = (game: Game, teamId: string): TeamDef =>
  game.teams.find((t: TeamDef) => t.id === teamId) || game.teams[0];

// ─── Create game ────────────────────────────────────────

export const createGame = (title?: string): Game => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return {
    title: title || `tournament ${mm} ${now.getFullYear()} game 1`,
    teams: [
      { id: 'Team1', playerIds: ['Jeff', 'Domna'], prefersBlockId: 'Jeff' },
      { id: 'Team2', playerIds: ['male', 'AnaPatricia'], prefersBlockId: null },
    ],
    players: [
      { id: 'Jeff' }, { id: 'Domna' }, { id: 'male' }, { id: 'AnaPatricia' },
    ],
    points: [],
  };
};

// ─── Score calculation ──────────────────────────────────

export const calculateScore = (game: Game, upToPointIdx?: number): Score => {
  const result: Score = { scoreTeam: [0, 0], setsTeam: [0, 0] };
  const limit = upToPointIdx !== undefined ? upToPointIdx : game.points.length;
  for (let i = 0; i < limit; i++) {
    const p = game.points[i];
    if (!p.wonByTeamId) continue;
    const ti = game.teams[0].id === p.wonByTeamId ? 0 : 1;
    result.scoreTeam[ti]++;
    const isLast = result.setsTeam[0] + result.setsTeam[1] >= 2;
    const needed = isLast ? 15 : 21;
    if (result.scoreTeam[ti] >= needed && result.scoreTeam[ti] - result.scoreTeam[1 - ti] >= 2) {
      result.setsTeam[ti]++;
      result.scoreTeam[0] = 0;
      result.scoreTeam[1] = 0;
    }
  }
  return result;
};

export const isSideSwapped = (game: Game, pointIdx: number): boolean => {
  const s = calculateScore(game, pointIdx);
  const isLast = s.setsTeam[0] + s.setsTeam[1] >= 2;
  const pace = isLast ? 5 : 7;
  const normal = Math.floor((s.scoreTeam[0] + s.scoreTeam[1]) / pace) % 2 === 1;
  const point = game.points[pointIdx];
  return point?.invertSideSwap ? !normal : normal;
};

// ─── Serving logic ──────────────────────────────────────

/**
 * Determine which team serves at a given point.
 * The team that won the previous point serves (or team 0 for point 0).
 */
export const getServingTeamId = (game: Game, pointIdx: number): string => {
  if (pointIdx === 0) return game.teams[0].id;
  const prev = game.points[pointIdx - 1];
  if (prev?.wonByTeamId) return prev.wonByTeamId;
  // fallback: check first rally of previous point
  if (prev?.rallies[0]?.teamId) {
    return prev.rallies[0].teamId;
  }
  return game.teams[0].id;
};

/**
 * Determine which player serves for a given team at a given point.
 * Alternates every time the team gets a new serve run (sideout).
 * Within a serve run (team keeps scoring), the same player serves.
 */
export const getServingPlayerId = (game: Game, teamId: string, pointIdx: number, invertPlayer?: boolean): string => {
  const team = teamById(game, teamId);
  // Count completed serve runs for this team before the current point.
  // A "serve run" = consecutive points where this team served.
  // The run index stays the same for continuation serves.
  let completedRuns = 0;
  let inRun = false;
  for (let i = 0; i < pointIdx; i++) {
    const p = game.points[i];
    if (!p.rallies.length) continue;
    const servTeam = p.rallies[0].teamId;
    if (servTeam === teamId) {
      if (!inRun) inRun = true;
    } else {
      if (inRun) { completedRuns++; inRun = false; }
    }
  }
  // completedRuns is the 0-based index of the current/next serve run
  const idx = invertPlayer ? (completedRuns % 2) : 1 - (completedRuns % 2);
  return team.playerIds[idx];
};

// ─── Touch navigation ───────────────────────────────────

export const getTouch = (game: Game, idx: TouchIndex | null): Touch | null => {
  if (!idx) return null;
  const p = game.points[idx.pointIdx];
  if (!p) return null;
  const r = p.rallies[idx.rallyIdx];
  if (!r) return null;
  return r.touches[idx.touchIdx] ?? null;
};

export const isLastTouchIndex = (game: Game, idx: TouchIndex): boolean => {
  const p = game.points[idx.pointIdx];
  if (!p || idx.pointIdx !== game.points.length - 1) return false;
  if (idx.rallyIdx !== p.rallies.length - 1) return false;
  const r = p.rallies[idx.rallyIdx];
  return idx.touchIdx === r.touches.length - 1;
};

export const getPrevTouch = (game: Game, idx: TouchIndex): TouchIndex | null => {
  if (idx.touchIdx > 0) return { ...idx, touchIdx: idx.touchIdx - 1 };
  if (idx.rallyIdx > 0) {
    const prevR = game.points[idx.pointIdx].rallies[idx.rallyIdx - 1];
    return { pointIdx: idx.pointIdx, rallyIdx: idx.rallyIdx - 1, touchIdx: prevR.touches.length - 1 };
  }
  if (idx.pointIdx > 0) {
    const prevP = game.points[idx.pointIdx - 1];
    const ri = prevP.rallies.length - 1;
    return { pointIdx: idx.pointIdx - 1, rallyIdx: ri, touchIdx: prevP.rallies[ri].touches.length - 1 };
  }
  return null;
};

export const getNextTouch = (game: Game, idx: TouchIndex): TouchIndex | null => {
  const p = game.points[idx.pointIdx];
  if (!p) return null;
  const r = p.rallies[idx.rallyIdx];
  if (!r) return null;
  if (idx.touchIdx + 1 < r.touches.length) return { ...idx, touchIdx: idx.touchIdx + 1 };
  if (idx.rallyIdx + 1 < p.rallies.length) return { pointIdx: idx.pointIdx, rallyIdx: idx.rallyIdx + 1, touchIdx: 0 };
  if (idx.pointIdx + 1 < game.points.length) return { pointIdx: idx.pointIdx + 1, rallyIdx: 0, touchIdx: 0 };
  return null;
};

export const getPrevPoint = (_game: Game, idx: TouchIndex): TouchIndex | null => {
  if (idx.pointIdx > 0) return { pointIdx: idx.pointIdx - 1, rallyIdx: 0, touchIdx: 0 };
  return null;
};

export const getNextPoint = (game: Game, idx: TouchIndex): TouchIndex | null => {
  if (idx.pointIdx + 1 < game.points.length) return { pointIdx: idx.pointIdx + 1, rallyIdx: 0, touchIdx: 0 };
  return null;
};

// ─── Player positions lookups ───────────────────────────

export const getPlayerPos = (playerId: string, touch: Touch, prevTouch: Touch | null): PlayerPos | null => {
  const e = touch.explicitPositions.find((p: PlayerPos) => p.id === playerId);
  if (e) return e;
  const c = touch.calculatedPositions.find((p: PlayerPos) => p.id === playerId);
  if (c) return c;
  if (prevTouch) return getPlayerPos(playerId, prevTouch, null);
  return null;
};

/**
 * Among a set of player IDs, find the one whose recorded position is closest to (bx, by).
 */
export const closestPlayerId = (
  ids: string[], bx: number, by: number, touch: Touch, prevTouch: Touch | null,
): string => {
  let best = ids[0];
  let bestD = Infinity;
  for (const id of ids) {
    const pos = getPlayerPos(id, touch, prevTouch);
    if (!pos) continue;
    const d = dist(bx, by, pos.x, pos.y);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
};

// ─── Search for reusable positions ──────────────────────

export const findLastServiceExplicitMoves = (
  game: Game, servingPlayerId: string, servingSide: number,
): PlayerPos[] => {
  for (let pi = game.points.length - 1; pi >= 0; pi--) {
    const p = game.points[pi];
    if (!p.rallies.length) continue;
    const r = p.rallies[0];
    if (!r.touches.length) continue;
    const t = r.touches[0];
    if (t.type !== 'serve') continue;
    if (pi === game.points.length - 1 && t.explicitPositions.length === 0) continue;
    if (t.playerId === servingPlayerId && t.startingSide === servingSide && t.explicitPositions.length > 0) {
      return t.explicitPositions.map((m: PlayerPos) => ({ ...m }));
    }
  }
  return [];
};

const fieldQuarter = (bx: number, by: number, fc: FieldConstants): number => {
  const isR = bx >= fc.width / 2 ? 1 : 0;
  const isB = by >= fc.height / 2 ? 1 : 0;
  return isR * 2 + isB;
};

export const findLastTouchExplicitMovesForOpponent = (
  game: Game, playerId: string, bx: number, by: number,
  opponentIds: string[], fc: FieldConstants,
): PlayerPos[] => {
  const q = fieldQuarter(bx, by, fc);
  for (let pi = game.points.length - 1; pi >= 0; pi--) {
    const p = game.points[pi];
    for (let ri = p.rallies.length - 1; ri >= 0; ri--) {
      const r = p.rallies[ri];
      for (let ti = r.touches.length - 1; ti >= 0; ti--) {
        const t = r.touches[ti];
        if (t.type === 'serve' || t.playerId !== playerId) continue;
        if (fieldQuarter(t.ballX, t.ballY, fc) !== q) continue;
        const opp = t.explicitPositions.filter((m: PlayerPos) => opponentIds.includes(m.id));
        if (opp.length > 0) return opp.map((m: PlayerPos) => ({ ...m }));
      }
    }
  }
  return [];
};

// ─── Touch stats computation ────────────────────────────

const isPlayerOnRightArmSide = (player: PlayerPos, other: PlayerPos, fw: number): boolean => {
  if (player.x < fw / 2) return player.y > other.y;
  return player.y < other.y;
};

const getBallSourceDirection = (player: PlayerPos, origin: PlayerPos, fw: number): number => {
  const dx = origin.x - player.x;
  const dy = origin.y - player.y;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return 0;
  if (player.x < fw / 2) {
    if (origin.x < player.x) return 3;
    const r = dy / (dx || 1);
    if (r > 0.2) return 2;
    if (r < -0.2) return 1;
  } else {
    if (origin.x > player.x) return 3;
    const r = dy / (-dx || 1);
    if (r > 0.2) return 1;
    if (r < -0.2) return 2;
  }
  return 0;
};

export const updateTouchStats = (game: Game, idx: TouchIndex, fc: FieldConstants) => {
  const touch = getTouch(game, idx);
  if (!touch || !touch.playerId) return;

  const prevIdx = getPrevTouch(game, idx);
  const nextIdx = getNextTouch(game, idx);
  const prevTouch = getTouch(game, prevIdx);
  const nextTouch = getTouch(game, nextIdx);

  const team = teamOfPlayer(game, touch.playerId);
  const otherId = otherPlayerId(team, touch.playerId);

  const playerP = getPlayerPos(touch.playerId, touch, prevTouch);
  const otherP = getPlayerPos(otherId, touch, prevTouch);

  // Determine startingSide: when the ball is near the net, use the player's
  // position to resolve which side the touch belongs to
  const NET_TOLERANCE = fc.width * 0.02; // ~2% of field width
  const nearNet = Math.abs(touch.ballX - fc.width / 2) < NET_TOLERANCE;
  if (nearNet && playerP) {
    touch.startingSide = playerP.x >= fc.width / 2 ? 0 : 1;
  } else {
    touch.startingSide = touch.ballX >= fc.width / 2 ? 0 : 1;
  }

  if (nextTouch) {
    touch.endingSide = nextTouch.ballX >= fc.width / 2 ? 0 : 1;
  }

  if (playerP && otherP) {
    touch.isPlayerOnRightArm = isPlayerOnRightArmSide(playerP, otherP, fc.width);
  }

  // ballSourceDirection (cross-net only)
  const isCross = prevIdx && prevIdx.pointIdx === idx.pointIdx && prevIdx.rallyIdx !== idx.rallyIdx;
  if (prevTouch && isCross && playerP) {
    touch.ballSourceDirection = getBallSourceDirection(
      playerP, { id: '', x: prevTouch.ballX, y: prevTouch.ballY }, fc.width,
    );
  }

  // toAcross
  if (prevTouch && nextTouch && playerP) {
    const inX = touch.ballX - prevTouch.ballX;
    const inY = touch.ballY - prevTouch.ballY;
    const outX = nextTouch.ballX - touch.ballX;
    const outY = nextTouch.ballY - touch.ballY;
    touch.toAcross = angleBetween(inX, inY, outX, outY) > TO_ACROSS_ANGLE;
  }

  // fromAcross
  if (nextTouch && prevTouch) {
    const lastP = getPlayerPos(touch.playerId, prevTouch, null);
    if (lastP) {
      const md = dist(lastP.x, lastP.y, touch.ballX, touch.ballY);
      if (md < fc.height * FROM_ACROSS_MIN_MOVE_FRAC) {
        touch.fromAcross = false;
      } else {
        const uX = lastP.x - touch.ballX;
        const uY = lastP.y - touch.ballY;
        const vX = nextTouch.ballX - touch.ballX;
        const vY = nextTouch.ballY - touch.ballY;
        touch.fromAcross = angleBetween(uX, uY, vX, vY) > FROM_ACROSS_ANGLE;
      }
    }
  }

  // isSentOutOfSystem
  if (nextTouch && nextIdx && nextIdx.rallyIdx === idx.rallyIdx && playerP && otherP) {
    touch.isSentOutOfSystem =
      (nextTouch.ballY > playerP.y && nextTouch.ballY > otherP.y) ||
      (nextTouch.ballY < playerP.y && nextTouch.ballY < otherP.y);
  }
};

// ─── Recalculate all touch stats ────────────────────────

export const recalculateAllStats = (game: Game, fc: FieldConstants) => {
  for (let pi = 0; pi < game.points.length; pi++) {
    const point = game.points[pi];
    for (let ri = 0; ri < point.rallies.length; ri++) {
      const rally = point.rallies[ri];
      for (let ti = 0; ti < rally.touches.length; ti++) {
        updateTouchStats(game, { pointIdx: pi, rallyIdx: ri, touchIdx: ti }, fc);
      }
    }
  }
};

// ─── Scoring a point ────────────────────────────────────

export const scorePoint = (game: Game, scoringTeamId: string, fc: FieldConstants) => {
  const lastP = game.points[game.points.length - 1];
  if (!lastP) return;
  lastP.wonByTeamId = scoringTeamId;

  // Compute stats on all touches
  let it: TouchIndex | null = { pointIdx: game.points.length - 1, rallyIdx: 0, touchIdx: 0 };
  const scoringTeam = teamById(game, scoringTeamId);
  let lastScoringIdx: TouchIndex | null = null;
  let lastFailIdx: TouchIndex | null = null;

  while (it && it.pointIdx === game.points.length - 1) {
    updateTouchStats(game, it, fc);
    const t = getTouch(game, it);
    if (t && t.playerId) {
      if (scoringTeam.playerIds.includes(t.playerId)) {
        lastScoringIdx = { ...it };
        lastFailIdx = null;
      } else if (!lastFailIdx) {
        lastFailIdx = { ...it };
      }
    }
    it = getNextTouch(game, it);
  }

  if (lastScoringIdx) {
    const st = getTouch(game, lastScoringIdx);
    if (st) st.isScoring = true;
  }
  if (lastFailIdx) {
    const ft = getTouch(game, lastFailIdx);
    if (ft) ft.isFail = true;
  }
};

// ─── Delete last touch ─────────────────────────────────

export const deleteLastTouch = (game: Game): TouchIndex => {
  if (!game.points.length) return { pointIdx: 0, rallyIdx: 0, touchIdx: 0 };

  let lastPi = game.points.length - 1;
  let lastPt = game.points[lastPi];

  // If the last point is an empty "next" point (pushed after scoring), remove it
  if (!lastPt.rallies.length || (lastPt.rallies.length === 1 && !lastPt.rallies[0].touches.length)) {
    game.points.pop();
    if (!game.points.length) return { pointIdx: 0, rallyIdx: 0, touchIdx: 0 };
    lastPi = game.points.length - 1;
    lastPt = game.points[lastPi];
    lastPt.wonByTeamId = undefined;
    // Clear scoring flags
    for (const r of lastPt.rallies) for (const t of r.touches) { t.isScoring = undefined; t.isFail = undefined; }
  }

  if (!lastPt.rallies.length) return { pointIdx: lastPi, rallyIdx: 0, touchIdx: 0 };

  const lastR = lastPt.rallies[lastPt.rallies.length - 1];
  if (lastR.touches.length > 0) lastR.touches.pop();
  if (lastR.touches.length === 0) lastPt.rallies.pop();

  if (!lastPt.rallies.length) {
    if (lastPi === 0) {
      return { pointIdx: 0, rallyIdx: 0, touchIdx: 0 };
    }
    game.points.pop();
    const prevPt = game.points[game.points.length - 1];
    prevPt.wonByTeamId = undefined;
    for (const r of prevPt.rallies) for (const t of r.touches) { t.isScoring = undefined; t.isFail = undefined; }
    const ri = prevPt.rallies.length - 1;
    return { pointIdx: game.points.length - 1, rallyIdx: ri, touchIdx: prevPt.rallies[ri].touches.length - 1 };
  }

  const r = lastPt.rallies[lastPt.rallies.length - 1];
  return { pointIdx: lastPi, rallyIdx: lastPt.rallies.length - 1, touchIdx: r.touches.length - 1 };
};

// ─── Line events ────────────────────────────────────────

export const addLineEvent = (
  game: Game, idx: TouchIndex, isLeft: boolean, event: string,
  fc: FieldConstants,
): string /* scoringTeamId */ => {
  const touch = getTouch(game, idx);
  if (!touch) return game.teams[0].id;
  const is1st = idx.touchIdx === 0;
  const ballSideMatchesLeft = (touch.ballX <= fc.width / 2) === isLeft;
  const sideScores = event === 'OUT' && is1st && ballSideMatchesLeft;
  const swapped = isSideSwapped(game, idx.pointIdx);
  const scoringSide = swapped === isLeft ? sideScores : !sideScores;
  return scoringSide ? game.teams[1].id : game.teams[0].id;
};

