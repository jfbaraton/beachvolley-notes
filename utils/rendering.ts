/**
 * Rendering / animation helpers.
 * Drives Reanimated SharedValues to animate ball and player sprites on the Skia canvas.
 */

import { withTiming, withSequence } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type {
  Game, TouchIndex, FieldConstants, AnimRefs, PlayerPos, Rally,
} from './types';
import {
  clampBallX, clampBallY, clampPlayerX, clampPlayerY,
  getTouch, getPrevTouch, getPlayerPos, closestPlayerId,
  otherTeam, otherPlayerId, teamById, teamOfPlayer,
  getServingTeamId, getServingPlayerId, isSideSwapped,
  calculateScore, findLastServiceExplicitMoves, findLastTouchExplicitMovesForOpponent,
} from './gameEngine';

type PlayerSV = { x: SharedValue<number>; y: SharedValue<number> };

const DUR_FAST = 50;
const DUR_NORMAL = 500;

// ─── helpers ────────────────────────────────────────────
const playerEntries = (refs: AnimRefs): [string, PlayerSV][] =>
  Object.entries(refs.players) as [string, PlayerSV][];

// ─── Save positions into touch data ─────────────────────

const savePositions = (
  game: Game, idx: TouchIndex,
  bx: number, by: number, positions: PlayerPos[],
) => {
  const t = getTouch(game, idx);
  if (!t) return;
  t.ballX = bx;
  t.ballY = by;
  t.calculatedPositions = positions.map(p => ({ ...p }));
};

// ─── Animate to a touch state ───────────────────────────

export const animateTouch = (
  refs: AnimRefs, game: Game, idx: TouchIndex | null, _fc: FieldConstants,
) => {
  const touch = getTouch(game, idx);
  if (!touch) return;
  const prev = idx ? getTouch(game, getPrevTouch(game, idx)) : null;

  // If previous touch exists, animate from there first
  if (prev) {
    for (const [pid, sv] of playerEntries(refs)) {
      const pp = getPlayerPos(pid, prev, null);
      if (pp) {
        sv.x.value = withTiming(pp.x, { duration: DUR_FAST });
        sv.y.value = withTiming(pp.y, { duration: DUR_FAST });
      }
    }
    refs.ballX.value = withTiming(prev.ballX, { duration: DUR_FAST });
    refs.ballY.value = withTiming(prev.ballY, { duration: DUR_FAST });
  }

  // Then animate to current touch
  for (const [pid, sv] of playerEntries(refs)) {
    const pp = getPlayerPos(pid, touch, prev);
    if (pp) {
      if (prev) {
        sv.x.value = withSequence(
          withTiming(getPlayerPos(pid, prev, null)?.x ?? pp.x, { duration: DUR_FAST }),
          withTiming(pp.x, { duration: DUR_NORMAL }),
        );
        sv.y.value = withSequence(
          withTiming(getPlayerPos(pid, prev, null)?.y ?? pp.y, { duration: DUR_FAST }),
          withTiming(pp.y, { duration: DUR_NORMAL }),
        );
      } else {
        sv.x.value = withTiming(pp.x, { duration: DUR_NORMAL });
        sv.y.value = withTiming(pp.y, { duration: DUR_NORMAL });
      }
    }
  }

  refs.ballX.value = prev
    ? withSequence(withTiming(prev.ballX, { duration: DUR_FAST }), withTiming(touch.ballX, { duration: DUR_NORMAL }))
    : withTiming(touch.ballX, { duration: DUR_NORMAL });
  refs.ballY.value = prev
    ? withSequence(withTiming(prev.ballY, { duration: DUR_FAST }), withTiming(touch.ballY, { duration: DUR_NORMAL }))
    : withTiming(touch.ballY, { duration: DUR_NORMAL });
};

// ─── Render serving position ────────────────────────────

export const setupServe = (
  refs: AnimRefs, game: Game, pointIdx: number, fc: FieldConstants,
  invertServingPlayer?: boolean,
): TouchIndex => {
  const point = game.points[pointIdx] || (() => {
    game.points[pointIdx] = { set: calculateScore(game, pointIdx).setsTeam[0] + calculateScore(game, pointIdx).setsTeam[1], rallies: [] };
    return game.points[pointIdx];
  })();

  const swapped = isSideSwapped(game, pointIdx);
  let servTeamId = getServingTeamId(game, pointIdx);

  // Handle manual invert
  if (point.invertServingTeam) {
    servTeamId = otherTeam(game, servTeamId).id;
  }

  const servTeam = teamById(game, servTeamId);
  const servPlayerId = getServingPlayerId(game, servTeamId, pointIdx, invertServingPlayer);
  const mateId = otherPlayerId(servTeam, servPlayerId);
  const oppTeam = otherTeam(game, servTeamId);
  const [oppId1, oppId2] = oppTeam.playerIds;

  // Determine sides
  // team[0] defaults to LEFT, team[1] defaults to RIGHT; swap flips it
  const servIsOnRight = (servTeam !== game.teams[0]) !== swapped;

  const servSide = servIsOnRight ? 0 : 1; // matches startingSide convention: 0=right, 1=left
  const mul = servIsOnRight ? -1 : 1; // multiplier for positioning
  const base = servIsOnRight ? fc.width : 0;

  // Look up reused explicit moves
  const reused = findLastServiceExplicitMoves(game, servPlayerId, servSide);

  // Compute target positions
  let serverX = clampPlayerX(base + mul * fc.servingX, fc);
  let serverY = clampPlayerY(fc.servingY, fc);
  const serverExplicit = reused.find(m => m.id === servPlayerId);
  if (serverExplicit) { serverX = serverExplicit.x; serverY = serverExplicit.y; }

  const mateX = clampPlayerX(base + mul * fc.serverMateX, fc);
  const mateY = clampPlayerY(fc.serverMateY, fc);

  const oppBase = servIsOnRight ? 0 : fc.width;
  const oppMul = servIsOnRight ? 1 : -1;
  const opp1X = clampPlayerX(oppBase + oppMul * fc.receiverX, fc);
  const opp1Y = clampPlayerY(fc.receiverY, fc);
  const opp2X = clampPlayerX(oppBase + oppMul * fc.receiverX, fc);
  const opp2Y = clampPlayerY(fc.height - fc.receiverY, fc);

  // Ball in front of server
  const ballX = clampBallX(base + mul * (fc.servingX + fc.ballSize * 1.5), fc);
  const ballY = serverY;

  // Animate
  refs.players[servPlayerId].x.value = withTiming(serverX, { duration: DUR_NORMAL });
  refs.players[servPlayerId].y.value = withTiming(serverY, { duration: DUR_NORMAL });
  refs.players[mateId].x.value = withTiming(mateX, { duration: DUR_NORMAL });
  refs.players[mateId].y.value = withTiming(mateY, { duration: DUR_NORMAL });
  refs.players[oppId1].x.value = withTiming(opp1X, { duration: DUR_NORMAL });
  refs.players[oppId1].y.value = withTiming(opp1Y, { duration: DUR_NORMAL });
  refs.players[oppId2].x.value = withTiming(opp2X, { duration: DUR_NORMAL });
  refs.players[oppId2].y.value = withTiming(opp2Y, { duration: DUR_NORMAL });
  refs.ballX.value = withTiming(ballX, { duration: DUR_FAST });
  refs.ballY.value = withTiming(ballY, { duration: DUR_FAST });

  // Apply reused explicit moves for non-server players
  for (const m of reused) {
    if (m.id === servPlayerId) continue;
    const sv = refs.players[m.id];
    if (sv) { sv.x.value = withTiming(m.x, { duration: DUR_NORMAL }); sv.y.value = withTiming(m.y, { duration: DUR_NORMAL }); }
  }

  // Create rally + serve touch if needed
  if (!point.rallies.length) {
    point.rallies.push({ teamId: servTeamId, touches: [] });
  }
  const rally = point.rallies[0];
  if (!rally.touches.length) {
    rally.touches.push({
      playerId: servPlayerId,
      ballX, ballY,
      type: 'serve',
      explicitPositions: reused,
      calculatedPositions: [],
      startingSide: servSide,
    });
  }

  const idx: TouchIndex = { pointIdx, rallyIdx: 0, touchIdx: 0 };

  savePositions(game, idx, ballX, ballY, [
    { id: servPlayerId, x: serverX, y: serverY },
    { id: mateId, x: mateX, y: mateY },
    { id: oppId1, x: opp1X, y: opp1Y },
    { id: oppId2, x: opp2X, y: opp2Y },
  ]);

  return idx;
};

// ─── Render receiving position (pass) ───────────────────

export const setupReceive = (
  refs: AnimRefs, game: Game, idx: TouchIndex, bx: number, by: number,
  fc: FieldConstants, forceReceiverId?: string,
): TouchIndex => {
  const point = game.points[idx.pointIdx];
  const prevRally = point.rallies[point.rallies.length - 2] || point.rallies[0];
  const lastAttackTouch = prevRally.touches[prevRally.touches.length - 1];

  // Determine receiving team (same side as ball)
  const prevTouch = getTouch(game, getPrevTouch(game, idx)) || lastAttackTouch;

  // Which team is on which side?
  const team0OnLeft = refs.players[game.teams[0].playerIds[0]].x.value < fc.width / 2;
  const ballOnLeft = bx < fc.width / 2;
  const recvTeam = teamById(game, (team0OnLeft === ballOnLeft) ? game.teams[0].id : game.teams[1].id);
  const attackTeam = otherTeam(game, recvTeam.id);

  // Determine receiver
  let receiverId: string;
  if (forceReceiverId) {
    receiverId = forceReceiverId;
  } else {
    const currentRally = point.rallies[point.rallies.length - 1];
    if (currentRally.touches.length > 0) {
      receiverId = currentRally.touches[0].playerId || recvTeam.playerIds[0];
    } else if (prevTouch) {
      receiverId = closestPlayerId(recvTeam.playerIds, bx, by, prevTouch, null);
    } else {
      receiverId = recvTeam.playerIds[0];
    }
  }
  const recvMateId = otherPlayerId(recvTeam, receiverId);

  // Blocker/defender on attack team
  const attackTouch = prevRally.touches[prevRally.touches.length - 1];
  const lastAttackerId = attackTouch?.playerId || attackTeam.playerIds[0];
  const lastNotAttackerId = otherPlayerId(attackTeam, lastAttackerId);
  const blockerId = attackTeam.prefersBlockId
    ? attackTeam.prefersBlockId
    : (attackTouch?.type === 'serve' ? lastNotAttackerId : lastAttackerId);
  const defenderId = otherPlayerId(attackTeam, blockerId);

  const ballOnRight = bx >= fc.width / 2;
  const ballInUpper = by < fc.height / 2;

  // Compute positions
  const blockerX = clampPlayerX(ballOnRight ? fc.blockingX : fc.width - fc.blockingX, fc);
  const blockerY = clampPlayerY((90 * by + 10 * fc.height / 2) / 100, fc);
  const defenderX = clampPlayerX(ballOnRight ? fc.defenderX : fc.width - fc.defenderX, fc);
  const defenderY = clampPlayerY(fc.height - (70 * by + 30 * fc.height / 2) / 100, fc);
  const receiverX = clampPlayerX(ballOnRight ? bx + fc.ballSize / 2 : bx - fc.ballSize / 2, fc);
  const receiverY = clampPlayerY(by, fc);
  const recvMateX = clampPlayerX(ballOnRight ? fc.width - fc.blockingX : fc.blockingX, fc);
  const recvMateY = clampPlayerY(ballInUpper ? by + fc.height / 5 : by - fc.height / 5, fc);

  const bxc = clampBallX(bx, fc);
  const byc = clampBallY(by, fc);

  // Find reusable opponent moves
  const oppIds = attackTeam.playerIds;
  const reusedOpp = findLastTouchExplicitMovesForOpponent(game, receiverId, bx, by, [...oppIds], fc);

  // Create touch
  const currentRally = point.rallies[point.rallies.length - 1];
  if (!currentRally.touches.length) {
    // Set endingSide on previous rally's last touch
    if (lastAttackTouch) {
      lastAttackTouch.endingSide = ballOnRight ? 0 : 1;
      lastAttackTouch.isFail = false;
    }
    currentRally.touches.push({
      playerId: receiverId,
      ballX: bxc, ballY: byc,
      type: 'pass',
      explicitPositions: reusedOpp,
      calculatedPositions: [],
      startingSide: ballOnRight ? 0 : 1,
    });
  } else if (forceReceiverId) {
    currentRally.touches[0].playerId = forceReceiverId;
  }

  const newIdx: TouchIndex = {
    pointIdx: idx.pointIdx,
    rallyIdx: point.rallies.length - 1,
    touchIdx: currentRally.touches.length - 1,
  };

  // Animate
  refs.players[blockerId].x.value = withTiming(blockerX, { duration: DUR_NORMAL });
  refs.players[blockerId].y.value = withTiming(blockerY, { duration: DUR_NORMAL });
  refs.players[defenderId].x.value = withTiming(defenderX, { duration: DUR_NORMAL });
  refs.players[defenderId].y.value = withTiming(defenderY, { duration: DUR_NORMAL });
  refs.players[receiverId].x.value = withTiming(receiverX, { duration: DUR_NORMAL });
  refs.players[receiverId].y.value = withTiming(receiverY, { duration: DUR_NORMAL });
  refs.players[recvMateId].x.value = withTiming(recvMateX, { duration: DUR_NORMAL });
  refs.players[recvMateId].y.value = withTiming(recvMateY, { duration: DUR_NORMAL });
  refs.ballX.value = withTiming(bxc, { duration: DUR_FAST });
  refs.ballY.value = withTiming(byc, { duration: DUR_FAST });

  savePositions(game, newIdx, bxc, byc, [
    { id: blockerId, x: blockerX, y: blockerY },
    { id: defenderId, x: defenderX, y: defenderY },
    { id: receiverId, x: receiverX, y: receiverY },
    { id: recvMateId, x: recvMateX, y: recvMateY },
  ]);

  // Apply reused explicit moves
  for (const m of reusedOpp) {
    const sv = refs.players[m.id];
    if (sv) { sv.x.value = withTiming(m.x, { duration: DUR_NORMAL }); sv.y.value = withTiming(m.y, { duration: DUR_NORMAL }); }
  }

  return newIdx;
};

// ─── Render set position ────────────────────────────────

export const setupSet = (
  refs: AnimRefs, game: Game, idx: TouchIndex, bx: number, by: number,
  fc: FieldConstants,
): TouchIndex => {
  const point = game.points[idx.pointIdx];
  const rally = point.rallies[idx.rallyIdx];
  const passingPlayerId = rally.touches[rally.touches.length - 1].playerId!;
  const team = teamOfPlayer(game, passingPlayerId);
  const setterId = otherPlayerId(team, passingPlayerId);

  const attackTeam = otherTeam(game, team.id);
  const prevRally = point.rallies.find((r: Rally) => r.teamId === attackTeam.id) || point.rallies[0];
  const attackTouch = prevRally.touches[prevRally.touches.length - 1];
  const lastAttackerId = attackTouch?.playerId || attackTeam.playerIds[0];
  const lastNotAttackerId = otherPlayerId(attackTeam, lastAttackerId);
  const blockerId = attackTeam.prefersBlockId || (attackTouch?.type === 'serve' ? lastNotAttackerId : lastAttackerId);
  const defenderId = otherPlayerId(attackTeam, blockerId);

  const ballOnRight = bx >= fc.width / 2;

  // Update previous touch
  const prevT = rally.touches[rally.touches.length - 1];
  prevT.endingSide = ballOnRight ? 0 : 1;
  prevT.isFail = false;

  // Positions
  const blockerX = clampPlayerX(ballOnRight ? fc.blockingX : fc.width - fc.blockingX, fc);
  const blockerY = clampPlayerY((90 * by + 10 * fc.height / 2) / 100, fc);
  const defenderXV = refs.players[defenderId].x.value;
  const defenderYV = refs.players[defenderId].y.value;

  const passerAbove = refs.players[passingPlayerId].y.value < refs.players[setterId].y.value;
  const passingX = clampPlayerX(ballOnRight ? fc.width - fc.approachX : fc.approachX, fc);
  const passingY = clampPlayerY(passerAbove ? by - fc.height / 6 : by + fc.height / 6, fc);
  const setterX = clampPlayerX(bx, fc);
  const setterY = clampPlayerY(passerAbove ? by + fc.ballSize / 2 : by - fc.ballSize / 2, fc);

  const bxc = clampBallX(bx, fc);
  const byc = clampBallY(by, fc);

  // Reusable opponent moves
  const oppIds = attackTeam.playerIds;
  const reused = findLastTouchExplicitMovesForOpponent(game, setterId, bx, by, [...oppIds], fc);

  rally.touches.push({
    playerId: setterId,
    ballX: bxc, ballY: byc,
    type: 'set',
    explicitPositions: reused,
    calculatedPositions: [],
    startingSide: ballOnRight ? 0 : 1,
  });

  const newIdx: TouchIndex = {
    pointIdx: idx.pointIdx, rallyIdx: idx.rallyIdx, touchIdx: rally.touches.length - 1,
  };

  refs.players[blockerId].x.value = withTiming(blockerX, { duration: DUR_NORMAL });
  refs.players[blockerId].y.value = withTiming(blockerY, { duration: DUR_NORMAL });
  refs.players[passingPlayerId].x.value = withTiming(passingX, { duration: DUR_NORMAL });
  refs.players[passingPlayerId].y.value = withTiming(passingY, { duration: DUR_NORMAL });
  refs.players[setterId].x.value = withTiming(setterX, { duration: DUR_NORMAL });
  refs.players[setterId].y.value = withTiming(setterY, { duration: DUR_NORMAL });
  refs.ballX.value = withTiming(bxc, { duration: DUR_FAST });
  refs.ballY.value = withTiming(byc, { duration: DUR_FAST });

  savePositions(game, newIdx, bxc, byc, [
    { id: blockerId, x: blockerX, y: blockerY },
    { id: defenderId, x: defenderXV, y: defenderYV },
    { id: passingPlayerId, x: passingX, y: passingY },
    { id: setterId, x: setterX, y: setterY },
  ]);

  for (const m of reused) {
    const sv = refs.players[m.id];
    if (sv) { sv.x.value = withTiming(m.x, { duration: DUR_NORMAL }); sv.y.value = withTiming(m.y, { duration: DUR_NORMAL }); }
  }

  return newIdx;
};

// ─── Render attack position ─────────────────────────────

export const setupAttack = (
  refs: AnimRefs, game: Game, idx: TouchIndex, bx: number, by: number,
  fc: FieldConstants,
): TouchIndex => {
  const point = game.points[idx.pointIdx];
  const rally = point.rallies[idx.rallyIdx];
  const settingPlayerId = rally.touches[rally.touches.length - 1].playerId!;
  const team = teamOfPlayer(game, settingPlayerId);
  const attackerId = otherPlayerId(team, settingPlayerId);

  const attackTeam = otherTeam(game, team.id);
  const prevRally = point.rallies.find((r: Rally) => r.teamId === attackTeam.id) || point.rallies[0];
  const attackTouch = prevRally.touches[prevRally.touches.length - 1];
  const lastAttackerId = attackTouch?.playerId || attackTeam.playerIds[0];
  const lastNotAttackerId = otherPlayerId(attackTeam, lastAttackerId);
  const blockerId = attackTeam.prefersBlockId || (attackTouch?.type === 'serve' ? lastNotAttackerId : lastAttackerId);
  const defenderId = otherPlayerId(attackTeam, blockerId);

  const ballOnRight = bx >= fc.width / 2;

  // Update previous touch
  const prevT = rally.touches[rally.touches.length - 1];
  prevT.endingSide = ballOnRight ? 0 : 1;
  prevT.isFail = false;

  const blockerX = clampPlayerX(ballOnRight ? fc.blockingX : fc.width - fc.blockingX, fc);
  const blockerY = clampPlayerY(by, fc);
  const defenderX = clampPlayerX(ballOnRight ? fc.defenderX : fc.width - fc.defenderX, fc);
  const defenderY = clampPlayerY(fc.height - (90 * by + 10 * fc.height / 2) / 100, fc);
  const attackerX = clampPlayerX(ballOnRight ? bx + fc.ballSize / 2 : bx - fc.ballSize / 2, fc);
  const attackerY = clampPlayerY(by, fc);
  const setterXV = refs.players[settingPlayerId].x.value;
  const setterYV = refs.players[settingPlayerId].y.value;

  const bxc = clampBallX(bx, fc);
  const byc = clampBallY(by, fc);

  const oppIds = attackTeam.playerIds;
  const reused = findLastTouchExplicitMovesForOpponent(game, attackerId, bx, by, [...oppIds], fc);

  rally.touches.push({
    playerId: attackerId,
    ballX: bxc, ballY: byc,
    type: 'attack',
    explicitPositions: reused,
    calculatedPositions: [],
    startingSide: ballOnRight ? 0 : 1,
  });

  const newIdx: TouchIndex = {
    pointIdx: idx.pointIdx, rallyIdx: idx.rallyIdx, touchIdx: rally.touches.length - 1,
  };

  refs.players[blockerId].x.value = withTiming(blockerX, { duration: 1000 });
  refs.players[blockerId].y.value = withTiming(blockerY, { duration: DUR_NORMAL });
  refs.players[defenderId].x.value = withTiming(defenderX, { duration: DUR_NORMAL });
  refs.players[defenderId].y.value = withTiming(defenderY, { duration: DUR_NORMAL });
  refs.players[attackerId].x.value = withTiming(attackerX, { duration: DUR_NORMAL });
  refs.players[attackerId].y.value = withTiming(attackerY, { duration: DUR_NORMAL });
  refs.ballX.value = withTiming(bxc, { duration: DUR_FAST });
  refs.ballY.value = withTiming(byc, { duration: DUR_FAST });

  savePositions(game, newIdx, bxc, byc, [
    { id: blockerId, x: blockerX, y: blockerY },
    { id: defenderId, x: defenderX, y: defenderY },
    { id: attackerId, x: attackerX, y: attackerY },
    { id: settingPlayerId, x: setterXV, y: setterYV },
  ]);

  for (const m of reused) {
    const sv = refs.players[m.id];
    if (sv) { sv.x.value = withTiming(m.x, { duration: DUR_NORMAL }); sv.y.value = withTiming(m.y, { duration: DUR_NORMAL }); }
  }

  return newIdx;
};

// ─── Ground hit (ball hits ground, no player touch) ─────

export const setupGroundHit = (
  refs: AnimRefs, game: Game, idx: TouchIndex, bx: number, by: number,
  fc: FieldConstants, groundResult?: 'IN' | 'OUT' | 'TOUCHED',
): TouchIndex => {
  const point = game.points[idx.pointIdx];
  const rally = point.rallies[point.rallies.length - 1];

  const bxc = clampBallX(bx, fc);
  const byc = clampBallY(by, fc);

  rally.touches.push({
    playerId: null,
    ballX: bxc, ballY: byc,
    type: 'ground',
    explicitPositions: [],
    calculatedPositions: [],
    groundResult,
  });

  const newIdx: TouchIndex = {
    pointIdx: idx.pointIdx,
    rallyIdx: point.rallies.length - 1,
    touchIdx: rally.touches.length - 1,
  };

  refs.ballX.value = withTiming(bxc, { duration: DUR_FAST });
  refs.ballY.value = withTiming(byc, { duration: DUR_FAST });

  // Save current player positions from their SharedValues
  const positions: PlayerPos[] = [];
  for (const [pid, sv] of playerEntries(refs)) {
    positions.push({ id: pid, x: sv.x.value, y: sv.y.value });
  }
  savePositions(game, newIdx, bxc, byc, positions);

  return newIdx;
};

