import { StyleSheet, ScrollView } from 'react-native';
import { View, Text } from '@/components/Themed';
import React, { useMemo, useState } from 'react';
import { CheckBox } from '@rneui/themed';
import { useGameContext } from '@/utils/GameContext';
import { computeStats, STAT_LABELS, emptyStats } from '@/utils/statsEngine';
import type { PlayerStats } from '@/utils/statsEngine';
import type { Game, TeamDef } from '@/utils/types';

export default function SummaryScreen() {
  const { game } = useGameContext();

  const [selectedTeams, setSelectedTeams] = useState<Record<string, boolean>>({});
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, boolean>>({});

  const teams: TeamDef[] = game?.teams || [];
  const allPlayerIds: string[] = teams.flatMap(t => t.playerIds);
  const allTeamIds: string[] = teams.map(t => t.id);

  React.useEffect(() => {
    if (!game) return;
    setSelectedTeams(prev => {
      const next = { ...prev };
      for (const id of allTeamIds) if (!(id in next)) next[id] = false;
      return next;
    });
    setSelectedPlayers(prev => {
      const next = { ...prev };
      for (const id of allPlayerIds) if (!(id in next)) next[id] = true;
      return next;
    });
  }, [game]);

  const { playerStats, teamStats } = useMemo(() => {
    if (!game || !game.points?.length) {
      return { playerStats: {} as Record<string, PlayerStats>, teamStats: {} as Record<string, PlayerStats> };
    }
    return computeStats(game);
  }, [game, game?.points?.length]);

  if (!game) {
    return (
      <View style={st.container}>
        <Text style={st.empty}>No game loaded. Go to the Beach notes tab to start or import a game.</Text>
      </View>
    );
  }

  const visibleTeamIds = allTeamIds.filter(id => selectedTeams[id]);
  const visiblePlayerIds = allPlayerIds.filter(id => selectedPlayers[id]);

  const columns: { label: string; stats: PlayerStats }[] = [
    ...visibleTeamIds.map(id => ({ label: id, stats: teamStats[id] || emptyStats() })),
    ...visiblePlayerIds.map(id => ({ label: id, stats: playerStats[id] || emptyStats() })),
  ];

  // Pre-compute best/worst index per stat row
  const extremes: Record<string, { maxIdx: number; minIdx: number; maxVal: number; minVal: number }> = {};
  for (const r of STAT_LABELS) {
    if (columns.length === 0) continue;
    let maxIdx = 0, minIdx = 0;
    let maxVal = columns[0].stats[r.key];
    let minVal = columns[0].stats[r.key];
    for (let i = 1; i < columns.length; i++) {
      const v = columns[i].stats[r.key];
      if (v > maxVal) { maxVal = v; maxIdx = i; }
      if (v < minVal) { minVal = v; minIdx = i; }
    }
    extremes[r.key] = { maxIdx, minIdx, maxVal, minVal };
  }

  return (
    <ScrollView contentContainerStyle={st.scroll}>
      <Text style={st.heading}>Game Summary</Text>

      <Text style={st.filterTitle}>Teams</Text>
      <View style={st.filterRow}>
        {allTeamIds.map(id => (
          <CheckBox key={'t-' + id} title={id}
            checked={!!selectedTeams[id]}
            onPress={() => setSelectedTeams(p => ({ ...p, [id]: !p[id] }))}
            containerStyle={st.cb} textStyle={st.cbTxt} />
        ))}
      </View>

      <Text style={st.filterTitle}>Players</Text>
      <View style={st.filterRow}>
        {allPlayerIds.map(id => (
          <CheckBox key={'p-' + id} title={id}
            checked={!!selectedPlayers[id]}
            onPress={() => setSelectedPlayers(p => ({ ...p, [id]: !p[id] }))}
            containerStyle={st.cb} textStyle={st.cbTxt} />
        ))}
      </View>

      {columns.length === 0 ? (
        <Text style={st.empty}>Select at least one team or player.</Text>
      ) : (
        <View style={st.table}>
          <View style={st.row}>
            <View style={[st.cell, st.headerCell, st.labelCell]}><Text style={st.headerTxt}> </Text></View>
            {columns.map(c => (
              <View key={c.label} style={[st.cell, st.headerCell]}>
                <Text style={st.headerTxt}>{c.label}</Text>
              </View>
            ))}
          </View>
          {STAT_LABELS.map(r => {
            const isNeg = r.polarity === 'negative';
            const isPos = r.polarity === 'positive';
            const rowBg = isNeg ? st.negRow : undefined;
            const ext = extremes[r.key];

            return (
              <View key={r.key} style={[st.row, rowBg]}>
                <View style={[st.cell, st.labelCell, rowBg]}>
                  <Text style={st.labelTxt}>{r.label}</Text>
                </View>
                {columns.map((c, ci) => {
                  let cellBg: object | undefined;
                  if (ext && ext.maxVal > ext.minVal) {
                    if (isNeg && ci === ext.maxIdx && ext.maxVal > 0) {
                      cellBg = st.worstCell;
                    } else if (isPos && ci === ext.maxIdx && ext.maxVal > 0) {
                      cellBg = st.bestCell;
                    }
                  }

                  return (
                    <View key={c.label + r.key} style={[st.cell, rowBg, cellBg]}>
                      <Text style={st.cellTxt}>{c.stats[r.key]}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  scroll: { padding: 12 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  empty: { fontSize: 16, textAlign: 'center', marginTop: 40, opacity: 0.6 },
  filterTitle: { fontSize: 15, fontWeight: '600', marginTop: 8, marginBottom: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  cb: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 4, paddingVertical: 2, marginHorizontal: 0 },
  cbTxt: { fontSize: 14, fontWeight: '400' },
  table: { marginTop: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, minWidth: 70, paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderRightWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  headerCell: { backgroundColor: '#2c3e50' },
  headerTxt: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  labelCell: { flex: 1.2, alignItems: 'flex-start' },
  labelTxt: { fontSize: 13, fontWeight: '500' },
  cellTxt: { fontSize: 15, fontWeight: '600' },
  negRow: { backgroundColor: '#fde8e8' },
  worstCell: { backgroundColor: '#f5a3a3' },
  bestCell: { backgroundColor: '#a3f5a3' },
});
