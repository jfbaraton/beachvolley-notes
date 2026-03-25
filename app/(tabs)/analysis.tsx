import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Canvas, useImage, Image, Path, Skia } from '@shopify/react-native-skia';
import { CheckBox } from '@rneui/themed';
import { useGameContext } from '@/utils/GameContext';
import type { Game, Touch, TeamDef } from '@/utils/types';

// @ts-ignore
import FieldImg from '@/assets/sprites/field.jpg';

const W = 720;
const H = 370;
const ARROW_HEAD = 10;  // arrowhead size
const STROKE_W = 2;

const TOUCH_TYPES = ['serve', 'pass', 'set', 'option', 'attack', 'block', 'ground'] as const;

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

interface Arrow {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
}

const buildArrows = (
  game: Game, fromIdx: number, toIdx: number,
  playerFilter: Set<string>, typeFilter: Set<string>,
): Arrow[] => {
  const arrows: Arrow[] = [];
  for (let pi = fromIdx; pi < toIdx; pi++) {
    const point = game.points[pi];
    if (!point) continue;

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
      // Filter: source touch player must be in the player filter
      if (src.playerId && !playerFilter.has(src.playerId)) continue;
      // Filter: source touch type must be in the type filter
      if (!typeFilter.has(src.type)) continue;
      let color = 'rgba(255,255,255,0.5)'; // default: semi-transparent white
      if (src.isScoring) color = 'rgba(0,200,0,0.8)';
      else if (src.isFail) color = 'rgba(220,40,40,0.8)';
      arrows.push({ x1: src.ballX, y1: src.ballY, x2: dst.ballX, y2: dst.ballY, color });
    }
  }
  return arrows;
};

export default function AnalysisScreen() {
  const { game } = useGameContext();
  const field = useImage(FieldImg.uri);

  const [rangeOpen, setRangeOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [fromPoint, setFromPoint] = useState('1');
  const [toPoint, setToPoint] = useState('');

  const teams: TeamDef[] = game?.teams || [];
  const allPlayerIds: string[] = teams.flatMap(t => t.playerIds);

  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, boolean>>({});
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const t of TOUCH_TYPES) init[t] = true;
    return init;
  });

  // Initialize player selection when game changes
  React.useEffect(() => {
    if (!game) return;
    setSelectedPlayers(prev => {
      const next = { ...prev };
      for (const id of allPlayerIds) if (!(id in next)) next[id] = true;
      return next;
    });
  }, [game]);

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
  const typeFilter = new Set(TOUCH_TYPES.filter(t => selectedTypes[t]));
  const arrows = buildArrows(game, fromIdx, toIdx, playerFilter, typeFilter);

  // Pre-build Skia paths grouped by color for fewer draw calls
  const byColor: Record<string, typeof arrows> = {};
  for (const a of arrows) {
    (byColor[a.color] ??= []).push(a);
  }

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

      {/* ─── Teams / Players filter (foldable) ─── */}
      <TouchableOpacity onPress={() => setFiltersOpen(v => !v)} style={st.foldHeader}>
        <Text style={st.filterTitle}>{filtersOpen ? '▼' : '▶'} Players</Text>
      </TouchableOpacity>
      {filtersOpen && (
        <View style={st.filterRow}>
          {allPlayerIds.map(id => (
            <CheckBox key={'p-' + id} title={id}
              checked={selectedPlayers[id]}
              onPress={() => setSelectedPlayers(p => ({ ...p, [id]: !p[id] }))}
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

      {/* ─── Field + arrows ─── */}
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
        </Canvas>
      ) : (
        <View style={st.center}><Text>Loading field…</Text></View>
      )}

      <Text style={st.legend}>
        <Text style={{ color: '#27ae60' }}>■</Text> Scoring &nbsp;
        <Text style={{ color: '#e74c3c' }}>■</Text> Failed &nbsp;
        <Text style={{ color: '#aaa' }}>■</Text> Neutral
      </Text>
      <Text style={st.info}>{arrows.length} arrows from points {fromIdx + 1}–{toIdx}</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  scroll: { padding: 12 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  empty: { fontSize: 16, textAlign: 'center', marginTop: 40, opacity: 0.6 },
  foldHeader: { paddingVertical: 6 },
  filterTitle: { fontSize: 15, fontWeight: '600' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4, alignItems: 'center' },
  rangeLabel: { fontSize: 14, fontWeight: '500', marginHorizontal: 6 },
  rangeInput: { borderWidth: 1, borderColor: '#aaa', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, fontSize: 14, width: 56, textAlign: 'center', backgroundColor: '#fff' },
  rangeHint: { fontSize: 13, opacity: 0.5, marginLeft: 6 },
  cb: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 4, paddingVertical: 2, marginHorizontal: 0 },
  cbTxt: { fontSize: 14, fontWeight: '400' },
  legend: { marginTop: 8, fontSize: 14 },
  info: { marginTop: 4, fontSize: 13, opacity: 0.5 },
});

