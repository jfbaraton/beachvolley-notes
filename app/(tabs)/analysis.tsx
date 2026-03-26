import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, TextInput, Image as RNImage } from 'react-native';
import { Canvas, useImage, Image, Path, Skia } from '@shopify/react-native-skia';
import { CheckBox } from '@rneui/themed';
import { useGameContext } from '@/utils/GameContext';
import { teamOfPlayer, calculateScore } from '@/utils/gameEngine';
import flagMap from '@/assets/flags/flagMap';
import type { Game, Touch, TeamDef } from '@/utils/types';

// @ts-ignore
import FieldImg from '@/assets/sprites/field.jpg';
// @ts-ignore
import TaruImg from '@/assets/sprites/Taru.png';
// @ts-ignore
import NiinaImg from '@/assets/sprites/Niina.jpg';
// @ts-ignore
import JeffImg from '@/assets/sprites/Jeff.jpg';
// @ts-ignore
import DomnaImg from '@/assets/sprites/Domna.jpg';
// @ts-ignore
import AnaPatriciaImg from '@/assets/sprites/AnaPatricia.png';
// @ts-ignore
import DudaImg from '@/assets/sprites/Duda.jpg';
// @ts-ignore
import BennettImg from '@/assets/sprites/Bennett.jpeg';
// @ts-ignore
import MaleImg from '@/assets/sprites/male.png';

const spriteRequires: Record<string, any> = {
  Taru: TaruImg, Niina: NiinaImg, Jeff: JeffImg, Domna: DomnaImg,
  AnaPatricia: AnaPatriciaImg, Duda: DudaImg, Bennett: BennettImg, male: MaleImg,
};

const W = 720;
const H = 370;
const ARROW_HEAD = 10;
const STROKE_W = 2;

const TOUCH_TYPES = ['serve', 'pass', 'set', 'option', 'attack', 'block', 'ground'] as const;

interface PosDir {
  fromLeft: boolean;
  fromRight: boolean;
  toLeft: boolean;
  toRight: boolean;
  short: boolean;
  long: boolean;
}

const defaultPosDir = (): PosDir => ({
  fromLeft: true, fromRight: true,
  toLeft: true, toRight: true,
  short: true, long: true,
});

/** Build an arrow path from (x1,y1) → (x2,y2) */
const arrowPath = (x1: number, y1: number, x2: number, y2: number) => {
  const path = Skia.Path.Make();
  path.moveTo(x1, y1);
  path.lineTo(x2, y2);

  // Arrowhead
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return path;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy; // perpendicular
  const py = ux;
  path.moveTo(x2, y2);
  path.lineTo(x2 - ux * ARROW_HEAD + px * ARROW_HEAD * 0.4, y2 - uy * ARROW_HEAD + py * ARROW_HEAD * 0.4);
  path.moveTo(x2, y2);
  path.lineTo(x2 - ux * ARROW_HEAD - px * ARROW_HEAD * 0.4, y2 - uy * ARROW_HEAD - py * ARROW_HEAD * 0.4);
  return path;
};

/** Central symmetry around field center */
const mirror = (x: number, y: number): [number, number] => [W - x, H - y];

/**
 * Determine if a touch needs mirroring for "fixed side" mode.
 * Team 0 is fixed to the LEFT side, team 1 to the RIGHT side.
 * Uses startingSide (0=right, 1=left) which handles net-edge touches correctly.
 * Falls back to ballX if startingSide is not set.
 */
const needsMirror = (game: Game, touch: Touch, fixedSide: boolean): boolean => {
  if (!fixedSide || !touch.playerId) return false;
  const team = teamOfPlayer(game, touch.playerId);
  const teamIdx = game.teams[0].id === team.id ? 0 : 1;
  // startingSide: 0=right, 1=left. Fall back to ballX.
  const touchOnRight = touch.startingSide !== undefined
    ? touch.startingSide === 0
    : touch.ballX >= W / 2;
  // Team 0 → left, Team 1 → right. Mirror if on the wrong side.
  return teamIdx === 0 ? touchOnRight : !touchOnRight;
};

interface ArrowPlayerPos { id: string; x: number; y: number }

interface Arrow {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
  /** Metadata for tooltip */
  srcPlayerId: string | null;
  dstPlayerId: string | null;
  srcType: string;
  pointIdx: number;       // 0-based
  touchIdxInPoint: number; // 0-based flat index within the point
  set: number;            // 0-based set index
  score: [number, number]; // score BEFORE this point
  /** All player positions at the time of this touch */
  playerPositions: ArrowPlayerPos[];
}

/**
 * Check if an arrow passes the Position/Direction filter.
 * Within each group, if both options are checked → pass all.
 * If one is checked → only matching arrows pass.
 * Touches with undefined properties always pass.
 */
const passPosDirFilter = (src: Touch, dst: Touch, pd: PosDir): boolean => {
  // ── From direction (based on src.isPlayerOnRightArm) ──
  if (pd.fromLeft !== pd.fromRight) {
    // Only one is checked → filter
    if (src.isPlayerOnRightArm !== undefined) {
      const fromLeft = !src.isPlayerOnRightArm;
      const fromRight = src.isPlayerOnRightArm;
      if (!((pd.fromLeft && fromLeft) || (pd.fromRight && fromRight))) return false;
    }
  }

  // ── To direction (requires src.toAcross, based on dst.isPlayerOnRightArm) ──
  if (pd.toLeft !== pd.toRight) {
    if (src.toAcross && dst.isPlayerOnRightArm !== undefined) {
      const toLeft = !dst.isPlayerOnRightArm;
      const toRight = dst.isPlayerOnRightArm;
      if (!((pd.toLeft && toLeft) || (pd.toRight && toRight))) return false;
    }
  }

  // ── Distance (based on dst.ballX distance from net) ──
  if (pd.short !== pd.long) {
    const distFromNet = Math.abs(dst.ballX - W / 2);
    const isShort = distFromNet < W / 6;
    const isLong = distFromNet > W / 3;
    if (!((pd.short && isShort) || (pd.long && isLong))) return false;
  }

  return true;
};

const buildArrows = (
  game: Game, fromIdx: number, toIdx: number,
  playerFilter: Set<string>, dstPlayerFilter: Set<string>, toFilterOr: boolean,
  typeFilter: Set<string>,
  fixedSide: boolean, posDir: PosDir,
  centeredPlayer: string | null, centeredPerf: 'direct_faults' | 'missed' | 'scoring',
): Arrow[] => {
  const arrows: Arrow[] = [];
  for (let pi = fromIdx; pi < toIdx; pi++) {
    const point = game.points[pi];
    if (!point) continue;

    const score = calculateScore(game, pi);
    const set = score.setsTeam[0] + score.setsTeam[1];

    // Flatten all touches in the point into a single list
    const touches: Touch[] = [];
    for (const rally of point.rallies) {
      for (const touch of rally.touches) {
        touches.push(touch);
      }
    }

    for (let i = 0; i < touches.length - 1; i++) {
      const src = touches[i];
      const dst = touches[i + 1];

      // Player filters: OR mode → pass if src OR dst matches; AND mode → both must match
      const srcMatch = !src.playerId || playerFilter.has(src.playerId);
      const dstMatch = !dst.playerId || dstPlayerFilter.has(dst.playerId);
      if (toFilterOr) {
        if (!srcMatch && !dstMatch) continue;
      } else {
        if (!srcMatch || !dstMatch) continue;
      }

      // Filter: source touch type must be in the type filter
      if (!typeFilter.has(src.type)) continue;
      // Filter: Position/Direction
      if (!passPosDirFilter(src, dst, posDir)) continue;

      // ── Player Centered filter ──
      if (centeredPlayer) {
        if (src.playerId !== centeredPlayer) continue;
        if (centeredPerf === 'direct_faults' && !src.isFail) continue;
        if (centeredPerf === 'missed' && !(src.isFail || (src.type === 'attack' && !src.isScoring))) continue;
        if (centeredPerf === 'scoring' && !src.isScoring) continue;
      }

      let x1 = src.ballX, y1 = src.ballY;
      let x2 = dst.ballX, y2 = dst.ballY;

      const shouldMirror = needsMirror(game, src, fixedSide);
      if (shouldMirror) {
        [x1, y1] = mirror(x1, y1);
        [x2, y2] = mirror(x2, y2);
      }

      // Collect all player positions (explicit override calculated)
      const posMap = new Map<string, { x: number; y: number }>();
      for (const p of src.calculatedPositions || []) posMap.set(p.id, { x: p.x, y: p.y });
      for (const p of src.explicitPositions || []) posMap.set(p.id, { x: p.x, y: p.y });
      const playerPositions: ArrowPlayerPos[] = [];
      posMap.forEach((pos, id) => {
        let px = pos.x, py = pos.y;
        if (shouldMirror) [px, py] = mirror(px, py);
        playerPositions.push({ id, x: px, y: py });
      });

      let color = 'rgba(255,255,255,0.5)'; // default: semi-transparent white
      if (src.isScoring) color = 'rgba(0,200,0,0.8)';
      else if (src.isFail) color = 'rgba(220,40,40,0.8)';
      arrows.push({
        x1, y1, x2, y2, color,
        srcPlayerId: src.playerId,
        dstPlayerId: dst.playerId,
        srcType: src.type,
        pointIdx: pi,
        touchIdxInPoint: i,
        set,
        score: [score.scoreTeam[0], score.scoreTeam[1]],
        playerPositions,
      });
    }
  }
  return arrows;
};

/** Distance from point (px,py) to line segment (ax,ay)-(bx,by) */
const distToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
};

export default function AnalysisScreen() {
  const { game } = useGameContext();
  const field = useImage(FieldImg.uri);

  const [rangeOpen, setRangeOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toFiltersOpen, setToFiltersOpen] = useState(false);
  const [toFilterOr, setToFilterOr] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [posDirOpen, setPosDirOpen] = useState(false);
  const [playerCenteredOpen, setPlayerCenteredOpen] = useState(false);
  const [centeredPlayer, setCenteredPlayer] = useState<string | null>(null);
  const [centeredPerf, setCenteredPerf] = useState<'direct_faults' | 'missed' | 'scoring'>('direct_faults');
  const [fixedSide, setFixedSide] = useState(false);
  const [fromPoint, setFromPoint] = useState('1');
  const [toPoint, setToPoint] = useState('');
  const [posDir, setPosDir] = useState<PosDir>(defaultPosDir);
  const [hoveredArrow, setHoveredArrow] = useState<Arrow | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const teams: TeamDef[] = game?.teams || [];
  const allPlayerIds: string[] = teams.flatMap(t => t.playerIds);
  const allTeamIds: string[] = teams.map(t => t.id);

  const [selectedTeams, setSelectedTeams] = useState<Record<string, boolean>>({});
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, boolean>>({});
  const [selectedToTeams, setSelectedToTeams] = useState<Record<string, boolean>>({});
  const [selectedToPlayers, setSelectedToPlayers] = useState<Record<string, boolean>>({});
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const t of TOUCH_TYPES) init[t] = true;
    return init;
  });

  // Initialize player and team selection when game changes
  React.useEffect(() => {
    if (!game) return;
    setSelectedTeams(prev => {
      const next = { ...prev };
      for (const id of allTeamIds) if (!(id in next)) next[id] = true;
      return next;
    });
    setSelectedPlayers(prev => {
      const next = { ...prev };
      for (const id of allPlayerIds) if (!(id in next)) next[id] = true;
      return next;
    });
    setSelectedToTeams(prev => {
      const next = { ...prev };
      for (const id of allTeamIds) if (!(id in next)) next[id] = true;
      return next;
    });
    setSelectedToPlayers(prev => {
      const next = { ...prev };
      for (const id of allPlayerIds) if (!(id in next)) next[id] = true;
      return next;
    });
  }, [game]);

  /** Toggle a "from" team checkbox: flips all its players on/off together */
  const toggleTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const newVal = !selectedTeams[teamId];
    setSelectedTeams(p => ({ ...p, [teamId]: newVal }));
    setSelectedPlayers(p => {
      const next = { ...p };
      for (const pid of team.playerIds) next[pid] = newVal;
      return next;
    });
  };

  /** Toggle a "to" team checkbox: flips all its players on/off together */
  const toggleToTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const newVal = !selectedToTeams[teamId];
    setSelectedToTeams(p => ({ ...p, [teamId]: newVal }));
    setSelectedToPlayers(p => {
      const next = { ...p };
      for (const pid of team.playerIds) next[pid] = newVal;
      return next;
    });
  };

  const totalPoints = game?.points?.length ?? 0;
  const fromIdx = Math.max(0, (parseInt(fromPoint, 10) || 1) - 1);
  const toIdx = Math.min(totalPoints, parseInt(toPoint, 10) || totalPoints);

  if (!game) {
    return (
      <View style={st.center}>
        <Text style={st.empty}>No game loaded.</Text>
      </View>
    );
  }

  const playerFilter = new Set(allPlayerIds.filter(id => selectedPlayers[id]));
  const dstPlayerFilter = new Set(allPlayerIds.filter(id => selectedToPlayers[id]));
  const typeFilter = new Set(TOUCH_TYPES.filter(t => selectedTypes[t]));
  const arrows = buildArrows(game, fromIdx, toIdx, playerFilter, dstPlayerFilter, toFilterOr, typeFilter, fixedSide, posDir, centeredPlayer, centeredPerf);

  // Pre-build Skia paths grouped by color for fewer draw calls
  const byColor: Record<string, Arrow[]> = {};
  for (const a of arrows) {
    (byColor[a.color] ??= []).push(a);
  }

  /** Find the nearest arrow to the cursor within a threshold */
  const onPointerMove = useCallback((e: any) => {
    const rect = e.currentTarget.getBoundingClientRect?.();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const THRESHOLD = 12;
    let best: Arrow | null = null;
    let bestDist = THRESHOLD;
    for (const a of arrows) {
      const d = distToSegment(mx, my, a.x1, a.y1, a.x2, a.y2);
      if (d < bestDist) { bestDist = d; best = a; }
    }
    setHoveredArrow(best);
    if (best) {
      // Position tooltip near cursor but clamped inside field
      setTooltipPos({ x: Math.min(mx + 12, W - 200), y: Math.max(my - 70, 0) });
    }
  }, [arrows]);

  const onPointerLeave = useCallback(() => setHoveredArrow(null), []);

  const tooltipText = hoveredArrow
    ? `Point ${hoveredArrow.pointIdx + 1}, ${ordinal(hoveredArrow.set + 1)} set, score ${hoveredArrow.score[0]}-${hoveredArrow.score[1]}, ${ordinal(hoveredArrow.touchIdxInPoint + 1)} touch of the rally (${hoveredArrow.srcType})`
    : '';

  return (
    <ScrollView contentContainerStyle={st.scroll}>
      <Text style={st.heading}>Target Analysis</Text>

      {/* ─── Point Range filter (foldable) ─── */}
      <TouchableOpacity onPress={() => setRangeOpen(v => !v)} style={st.foldHeader}>
        <Text style={st.filterTitle}>{rangeOpen ? '▼' : '▶'} Point Range</Text>
      </TouchableOpacity>
      {rangeOpen && (
        <View style={st.filterRow}>
          <Text style={st.rangeLabel}>From</Text>
          <TextInput
            style={st.rangeInput}
            value={fromPoint}
            onChangeText={setFromPoint}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Text style={st.rangeLabel}>To</Text>
          <TextInput
            style={st.rangeInput}
            value={toPoint}
            onChangeText={setToPoint}
            keyboardType="numeric"
            placeholder={String(totalPoints)}
            selectTextOnFocus
          />
          <Text style={st.rangeHint}>/ {totalPoints}</Text>
        </View>
      )}

      {/* ─── From Teams / Players filter (foldable) ─── */}
      <TouchableOpacity onPress={() => setFiltersOpen(v => !v)} style={st.foldHeader}>
        <Text style={st.filterTitle}>{filtersOpen ? '▼' : '▶'} From Teams / Players</Text>
      </TouchableOpacity>
      {filtersOpen && (
        <View style={st.filterRow}>
          {allTeamIds.map(id => (
            <CheckBox key={'t-' + id} title={id}
              checked={selectedTeams[id]}
              onPress={() => toggleTeam(id)}
              containerStyle={st.cb} textStyle={[st.cbTxt, { fontWeight: '700' }]} />
          ))}
          {allPlayerIds.map(id => (
            <CheckBox key={'p-' + id} title={id}
              checked={selectedPlayers[id]}
              onPress={() => setSelectedPlayers(p => ({ ...p, [id]: !p[id] }))}
              containerStyle={st.cb} textStyle={st.cbTxt} />
          ))}
        </View>
      )}

      {/* ─── To Teams / Players filter (foldable) ─── */}
      <TouchableOpacity onPress={() => setToFiltersOpen(v => !v)} style={st.foldHeader}>
        <Text style={st.filterTitle}>{toFiltersOpen ? '▼' : '▶'} To Teams / Players</Text>
      </TouchableOpacity>
      {toFiltersOpen && (
        <View style={st.filterRow}>
          <CheckBox title="Or (match From or To)"
            checked={toFilterOr}
            onPress={() => setToFilterOr(v => !v)}
            containerStyle={st.cb} textStyle={[st.cbTxt, { fontStyle: 'italic' }]} />
          {allTeamIds.map(id => (
            <CheckBox key={'to-t-' + id} title={id}
              checked={selectedToTeams[id]}
              onPress={() => toggleToTeam(id)}
              containerStyle={st.cb} textStyle={[st.cbTxt, { fontWeight: '700' }]} />
          ))}
          {allPlayerIds.map(id => (
            <CheckBox key={'to-p-' + id} title={id}
              checked={selectedToPlayers[id]}
              onPress={() => setSelectedToPlayers(p => ({ ...p, [id]: !p[id] }))}
              containerStyle={st.cb} textStyle={st.cbTxt} />
          ))}
        </View>
      )}

      {/* ─── Touch Type filter (foldable) ─── */}
      <TouchableOpacity onPress={() => setTypesOpen(v => !v)} style={st.foldHeader}>
        <Text style={st.filterTitle}>{typesOpen ? '▼' : '▶'} Touch Types</Text>
      </TouchableOpacity>
      {typesOpen && (
        <View style={st.filterRow}>
          {TOUCH_TYPES.map(t => (
            <CheckBox key={'tt-' + t} title={t}
              checked={selectedTypes[t]}
              onPress={() => setSelectedTypes(p => ({ ...p, [t]: !p[t] }))}
              containerStyle={st.cb} textStyle={st.cbTxt} />
          ))}
        </View>
      )}

      {/* ─── Position / Direction filter (foldable) ─── */}
      <TouchableOpacity onPress={() => setPosDirOpen(v => !v)} style={st.foldHeader}>
        <Text style={st.filterTitle}>{posDirOpen ? '▼' : '▶'} Position / Direction</Text>
      </TouchableOpacity>
      {posDirOpen && (
        <View style={st.posDirContainer}>
          <Text style={st.posDirGroupLabel}>From</Text>
          <View style={st.filterRow}>
            <CheckBox title="From left" checked={posDir.fromLeft}
              onPress={() => setPosDir(p => ({ ...p, fromLeft: !p.fromLeft }))}
              containerStyle={st.cb} textStyle={st.cbTxt} />
            <CheckBox title="From right" checked={posDir.fromRight}
              onPress={() => setPosDir(p => ({ ...p, fromRight: !p.fromRight }))}
              containerStyle={st.cb} textStyle={st.cbTxt} />
          </View>
          <Text style={st.posDirGroupLabel}>To</Text>
          <View style={st.filterRow}>
            <CheckBox title="To left" checked={posDir.toLeft}
              onPress={() => setPosDir(p => ({ ...p, toLeft: !p.toLeft }))}
              containerStyle={st.cb} textStyle={st.cbTxt} />
            <CheckBox title="To right" checked={posDir.toRight}
              onPress={() => setPosDir(p => ({ ...p, toRight: !p.toRight }))}
              containerStyle={st.cb} textStyle={st.cbTxt} />
          </View>
          <Text style={st.posDirGroupLabel}>Distance</Text>
          <View style={st.filterRow}>
            <CheckBox title="Short" checked={posDir.short}
              onPress={() => setPosDir(p => ({ ...p, short: !p.short }))}
              containerStyle={st.cb} textStyle={st.cbTxt} />
            <CheckBox title="Long" checked={posDir.long}
              onPress={() => setPosDir(p => ({ ...p, long: !p.long }))}
              containerStyle={st.cb} textStyle={st.cbTxt} />
          </View>
        </View>
      )}

      {/* ─── Player Centered filter (foldable) ─── */}
      <TouchableOpacity onPress={() => setPlayerCenteredOpen(v => !v)} style={st.foldHeader}>
        <Text style={st.filterTitle}>{playerCenteredOpen ? '▼' : '▶'} Player Centered</Text>
      </TouchableOpacity>
      {playerCenteredOpen && (
        <View style={st.posDirContainer}>
          <Text style={st.posDirGroupLabel}>Player</Text>
          <View style={st.filterRow}>
            <CheckBox title="None"
              checked={centeredPlayer === null}
              onPress={() => setCenteredPlayer(null)}
              checkedIcon="dot-circle-o" uncheckedIcon="circle-o"
              containerStyle={st.cb} textStyle={st.cbTxt} />
            {allPlayerIds.map(id => (
              <CheckBox key={'cp-' + id} title={id}
                checked={centeredPlayer === id}
                onPress={() => setCenteredPlayer(id)}
                checkedIcon="dot-circle-o" uncheckedIcon="circle-o"
                containerStyle={st.cb} textStyle={st.cbTxt} />
            ))}
          </View>
          <Text style={st.posDirGroupLabel}>Perf</Text>
          <View style={st.filterRow}>
            <CheckBox title="Direct faults"
              checked={centeredPerf === 'direct_faults'}
              onPress={() => setCenteredPerf('direct_faults')}
              checkedIcon="dot-circle-o" uncheckedIcon="circle-o"
              containerStyle={st.cb} textStyle={st.cbTxt} />
            <CheckBox title="Missed"
              checked={centeredPerf === 'missed'}
              onPress={() => setCenteredPerf('missed')}
              checkedIcon="dot-circle-o" uncheckedIcon="circle-o"
              containerStyle={st.cb} textStyle={st.cbTxt} />
            <CheckBox title="Scoring"
              checked={centeredPerf === 'scoring'}
              onPress={() => setCenteredPerf('scoring')}
              checkedIcon="dot-circle-o" uncheckedIcon="circle-o"
              containerStyle={st.cb} textStyle={st.cbTxt} />
          </View>
        </View>
      )}

      {/* ─── Fixed side toggle ─── */}
      <CheckBox
        title="Fixed side per team"
        checked={fixedSide}
        onPress={() => setFixedSide(v => !v)}
        containerStyle={st.cb}
        textStyle={st.cbTxt}
      />

      {/* ─── Field + arrows + hover overlay ─── */}
      <View style={st.fieldContainer}>
        {fixedSide && (
          <View style={st.flagRow}>
            {flagMap[game.teams[0].id] ? (
              <RNImage source={flagMap[game.teams[0].id]} style={st.flagLeft} resizeMode="cover" />
            ) : (
              <Text style={st.flagLabel}>{game.teams[0].id}</Text>
            )}
            {flagMap[game.teams[1].id] ? (
              <RNImage source={flagMap[game.teams[1].id]} style={st.flagRight} resizeMode="cover" />
            ) : (
              <Text style={st.flagLabel}>{game.teams[1].id}</Text>
            )}
          </View>
        )}
        {field ? (
          <Canvas style={{ width: W, height: H }}>
            <Image image={field} width={W} height={H} fit="cover" />
            {Object.entries(byColor).map(([color, group]) => {
              const path = Skia.Path.Make();
              for (const a of group) {
                const ap = arrowPath(a.x1, a.y1, a.x2, a.y2);
                path.addPath(ap);
              }
              return (
                <Path
                  key={color}
                  path={path}
                  color={color}
                  style="stroke"
                  strokeWidth={STROKE_W}
                  strokeCap="round"
                />
              );
            })}
            {/* Highlight hovered arrow */}
            {hoveredArrow && (() => {
              const hp = arrowPath(hoveredArrow.x1, hoveredArrow.y1, hoveredArrow.x2, hoveredArrow.y2);
              return <Path path={hp} color="rgba(255,255,0,0.9)" style="stroke" strokeWidth={STROKE_W + 2} strokeCap="round" />;
            })()}
          </Canvas>
        ) : (
          <View style={st.center}><Text>Loading field…</Text></View>
        )}
        {/* Transparent hover overlay */}
        <View
          style={st.hoverOverlay}
          // @ts-ignore – web-only pointer events
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        />
        {/* Player icons at their positions */}
        {hoveredArrow && hoveredArrow.playerPositions.map(pp => (
          <RNImage
            key={pp.id}
            source={spriteRequires[pp.id] || spriteRequires['male']}
            style={[
              st.fieldIcon,
              { left: pp.x - 16, top: pp.y - 16 },
              (pp.id === hoveredArrow.srcPlayerId || pp.id === hoveredArrow.dstPlayerId)
                ? st.fieldIconHighlight : st.fieldIconDim,
            ]}
          />
        ))}
        {/* Tooltip */}
        {hoveredArrow && (
          <View style={[st.tooltip, { left: tooltipPos.x, top: tooltipPos.y }]}>
            <Text style={st.tooltipTxt}>{tooltipText}</Text>
          </View>
        )}
      </View>

      <View style={st.footer}>
        <Text style={st.legend}>
          <Text style={{ color: '#27ae60' }}>■</Text> Scoring &nbsp;
          <Text style={{ color: '#e74c3c' }}>■</Text> Failed &nbsp;
          <Text style={{ color: '#aaa' }}>■</Text> Neutral
        </Text>
        <Text style={st.info}>{arrows.length} arrows from points {fromIdx + 1}–{toIdx}</Text>
      </View>
    </ScrollView>
  );
}

/** Return "1st", "2nd", "3rd", "4th", etc. */
const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  scroll: { padding: 12, alignItems: 'center' },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  empty: { fontSize: 16, textAlign: 'center', marginTop: 40, opacity: 0.6 },
  foldHeader: { paddingVertical: 6, alignSelf: 'stretch' },
  filterTitle: { fontSize: 15, fontWeight: '600' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4, alignItems: 'center', alignSelf: 'stretch' },
  rangeLabel: { fontSize: 14, fontWeight: '500', marginHorizontal: 6 },
  rangeInput: { borderWidth: 1, borderColor: '#aaa', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, fontSize: 14, width: 56, textAlign: 'center', backgroundColor: '#fff' },
  rangeHint: { fontSize: 13, opacity: 0.5, marginLeft: 6 },
  cb: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 4, paddingVertical: 2, marginHorizontal: 0 },
  cbTxt: { fontSize: 14, fontWeight: '400' },
  fieldContainer: { position: 'relative', width: W, marginTop: 8 },
  flagRow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1, pointerEvents: 'none', paddingHorizontal: 8 },
  flagLeft: { width: 48, height: 30, borderRadius: 3, opacity: 0.7 },
  flagRight: { width: 48, height: 30, borderRadius: 3, opacity: 0.7 },
  flagLabel: { fontSize: 12, fontWeight: '700', color: '#fff', opacity: 0.7 },
  footer: { alignItems: 'center', marginTop: 8 },
  legend: { fontSize: 14 },
  info: { marginTop: 4, fontSize: 13, opacity: 0.5 },
  posDirContainer: { alignSelf: 'stretch', marginBottom: 4 },
  posDirGroupLabel: { fontSize: 13, fontWeight: '600', opacity: 0.6, marginTop: 4, marginLeft: 4 },
  hoverOverlay: { position: 'absolute', top: 0, left: 0, width: W, height: H, zIndex: 2 },
  fieldIcon: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2, zIndex: 4, pointerEvents: 'none' as const },
  fieldIconHighlight: { borderColor: '#ffe600', opacity: 1 },
  fieldIconDim: { borderColor: '#fff', opacity: 0.55 },
  tooltip: { position: 'absolute', zIndex: 3, backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 6, padding: 8, maxWidth: 260 },
  tooltipTxt: { color: '#fff', fontSize: 12 },
});

