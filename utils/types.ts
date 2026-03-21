/**
 * Normalized data model for beach volleyball game recording.
 * Teams and players are defined once; touches reference them by ID.
 */

// ─── Player & Team Definitions (stored once at game level) ───

export interface PlayerDef {
  id: string;
}

export interface TeamDef {
  id: string;
  playerIds: [string, string]; // exactly 2 players
  prefersBlockId: string | null;
}

// ─── Touch / Rally / Point ───

/** Where each player was during a touch */
export interface PlayerPos {
  id: string;
  x: number;
  y: number;
  reason?: string; // e.g. 'block', 'drop', 'call'
}

export interface Touch {
  /** null = ball hit the ground (no player contact) */
  playerId: string | null;
  ballX: number;
  ballY: number;
  type: 'serve' | 'pass' | 'set' | 'option' | 'attack' | 'ground';
  /** User-dragged positions (persisted) */
  explicitPositions: PlayerPos[];
  /** Calculated default positions (auto-filled) */
  calculatedPositions: PlayerPos[];
  /** Ground hit result: IN / OUT / TOUCHED */
  groundResult?: 'IN' | 'OUT' | 'TOUCHED';
  // Computed stats (filled on scoring)
  isScoring?: boolean;
  isFail?: boolean;
  startingSide?: number; // 0=right, 1=left  (from UI perspective)
  endingSide?: number;
  isPlayerOnRightArm?: boolean;
  ballSourceDirection?: number; // 0=front, 1=left, 2=right, 3=behind
  fromAcross?: boolean;
  toAcross?: boolean;
  isSentOutOfSystem?: boolean;
}

export interface Rally {
  teamId: string;
  touches: Touch[];
}

export interface Point {
  set: number;
  rallies: Rally[];
  wonByTeamId?: string;
  /** How the point was called: IN / OUT / TOUCHED / NET */
  lineCall?: 'IN' | 'OUT' | 'TOUCHED' | 'NET';
  /** Player who caused the line call (e.g. net fault) */
  lineCallPlayerId?: string;
  invertSideSwap?: boolean;
  invertServingTeam?: boolean;
  invertServingPlayer?: boolean;
}

// ─── Game ───

export interface Game {
  title: string;
  teams: [TeamDef, TeamDef];
  players: PlayerDef[];
  points: Point[];
}

// ─── Score ───

export interface Score {
  scoreTeam: [number, number];
  setsTeam: [number, number];
}

// ─── Navigation ───

export interface TouchIndex {
  pointIdx: number;
  rallyIdx: number;
  touchIdx: number;
}

// ─── Field rendering constants ───

export interface FieldConstants {
  width: number;
  height: number;
  ballSize: number;
  playerSize: number;
  servingX: number;
  servingY: number;
  serverMateX: number;
  serverMateY: number;
  blockingX: number;
  defenderX: number;
  defenderY: number;
  receiverX: number;
  receiverY: number;
  approachX: number;
}

// ─── Shared value refs (for Reanimated/Skia) ───

import type { SharedValue } from 'react-native-reanimated';

export interface AnimRefs {
  ballX: SharedValue<number>;
  ballY: SharedValue<number>;
  players: Record<string, { x: SharedValue<number>; y: SharedValue<number> }>;
}

