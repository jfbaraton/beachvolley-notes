import { StyleSheet, ScrollView } from 'react-native';
import { View, Text } from '@/components/Themed';
import React, { useMemo, useState } from 'react';
import { CheckBox } from '@rneui/themed';
import { useGameContext } from '@/utils/GameContext';
import type { Game, Team } from '@/utils/BeachVolleyUtils';

interface PlayerStats {
    aces: number;
    failedServes: number;
    aced: number;
    attacks: number;
    faults: number;
}

const emptyStats = (): PlayerStats => ({
    aces: 0,
    failedServes: 0,
    aced: 0,
    attacks: 0,
    faults: 0,
});

/**
 * Compute per-player and per-team statistics from game points.
 */
const computeStats = (game: Game) => {
    const playerStats: Record<string, PlayerStats> = {};
    const teamStats: Record<string, PlayerStats> = {};

    // Init stats for all known players and teams
    for (const team of game.teams) {
        teamStats[team.id] = emptyStats();
        for (const player of team.players) {
            playerStats[player.id] = emptyStats();
        }
    }

    for (const point of game.points) {
        if (!point.wonBy || !point.teamTouches?.length) continue;

        const winningTeamId = point.wonBy.id;
        const allTeamTouches = point.teamTouches;

        // --- Service analysis ---
        const servingTT = allTeamTouches[0];
        if (!servingTT?.touch?.length) continue;
        const serveTouch = servingTT.touch[0];
        const servingPlayerId = serveTouch.player?.id;
        const servingTeamId = servingTT.team?.id;
        if (!servingPlayerId || !servingTeamId) continue;

        const isServingTeamWon = winningTeamId === servingTeamId;
        const receivingTT = allTeamTouches.length > 1 ? allTeamTouches[1] : null;

        // Ace: serving team won AND ball never came back past the receiving team
        // (at most 2 team-touch groups: serve side + receive side, no return)
        if (isServingTeamWon && allTeamTouches.length <= 2) {
            if (playerStats[servingPlayerId]) playerStats[servingPlayerId].aces++;
            if (teamStats[servingTeamId]) teamStats[servingTeamId].aces++;

            // Aced: receiving team / first receiver
            if (receivingTT?.touch?.length) {
                const firstReceiver = receivingTT.touch[0].player?.id;
                const receivingTeamId = receivingTT.team?.id;
                if (firstReceiver && playerStats[firstReceiver]) playerStats[firstReceiver].aced++;
                if (receivingTeamId && teamStats[receivingTeamId]) teamStats[receivingTeamId].aced++;
            } else {
                const receivingTeam = game.teams.find(t => t.id !== servingTeamId);
                if (receivingTeam && teamStats[receivingTeam.id]) teamStats[receivingTeam.id].aced++;
            }
        }

        // Failed serve: serving team lost and only the serve happened (no receive)
        if (!isServingTeamWon && (!receivingTT || servingTT.touch.length === 1 && serveTouch.isFail)) {
            if (playerStats[servingPlayerId]) playerStats[servingPlayerId].failedServes++;
            if (teamStats[servingTeamId]) teamStats[servingTeamId].failedServes++;
        }

        // --- Attack / Fault analysis (last touch, excluding service) ---
        const lastTTGroup = allTeamTouches[allTeamTouches.length - 1];
        const lastTouch = lastTTGroup?.touch?.[lastTTGroup.touch.length - 1];
        const lastTouchPlayerId = lastTouch?.player?.id;
        const lastTouchTeamId = lastTTGroup?.team?.id;

        if (lastTouchPlayerId && lastTouchTeamId && lastTouch.stateName !== 'service') {
            if (winningTeamId === lastTouchTeamId) {
                if (playerStats[lastTouchPlayerId]) playerStats[lastTouchPlayerId].attacks++;
                if (teamStats[lastTouchTeamId]) teamStats[lastTouchTeamId].attacks++;
            } else {
                if (playerStats[lastTouchPlayerId]) playerStats[lastTouchPlayerId].faults++;
                if (teamStats[lastTouchTeamId]) teamStats[lastTouchTeamId].faults++;
            }
        }
    }

    return { playerStats, teamStats };
};

const STAT_ROWS: { key: keyof PlayerStats; label: string }[] = [
    { key: 'aces', label: 'Aces' },
    { key: 'failedServes', label: 'Failed serves' },
    { key: 'aced', label: 'Aced' },
    { key: 'attacks', label: 'Attacks' },
    { key: 'faults', label: 'Faults' },
];

export default function SummaryScreen() {
    const { game } = useGameContext();

    const [selectedTeams, setSelectedTeams] = useState<Record<string, boolean>>({});
    const [selectedPlayers, setSelectedPlayers] = useState<Record<string, boolean>>({});

    const teams: Team[] = game?.teams || [];
    const allPlayerIds: string[] = teams.flatMap(t => t.players.map(p => p.id));
    const allTeamIds: string[] = teams.map(t => t.id);

    // Default-select new teams/players
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
    }, [game]);

    const { playerStats, teamStats } = useMemo(() => {
        if (!game || !game.points?.length) {
            return {
                playerStats: {} as Record<string, PlayerStats>,
                teamStats: {} as Record<string, PlayerStats>,
            };
        }
        return computeStats(game);
    }, [game, game?.points?.length]);

    if (!game) {
        return (
            <View style={styles.container}>
                <Text style={styles.empty}>No game loaded. Go to the Beach notes tab to start or import a game.</Text>
            </View>
        );
    }

    const visibleTeamIds = allTeamIds.filter((id: string) => selectedTeams[id]);
    const visiblePlayerIds = allPlayerIds.filter((id: string) => selectedPlayers[id]);

    const columns: { label: string; stats: PlayerStats }[] = [
        ...visibleTeamIds.map((id: string) => ({ label: id, stats: teamStats[id] || emptyStats() })),
        ...visiblePlayerIds.map((id: string) => ({ label: id, stats: playerStats[id] || emptyStats() })),
    ];

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            {/* Filters */}
            <Text style={styles.filterTitle}>Teams</Text>
            <View style={styles.filterRow}>
                {allTeamIds.map((id: string) => (
                    <CheckBox
                        key={'team-' + id}
                        title={id}
                        checked={!!selectedTeams[id]}
                        onPress={() => setSelectedTeams(prev => ({ ...prev, [id]: !prev[id] }))}
                        containerStyle={styles.checkBox}
                        textStyle={styles.checkBoxText}
                    />
                ))}
            </View>
            <Text style={styles.filterTitle}>Players</Text>
            <View style={styles.filterRow}>
                {allPlayerIds.map((id: string) => (
                    <CheckBox
                        key={'player-' + id}
                        title={id}
                        checked={!!selectedPlayers[id]}
                        onPress={() => setSelectedPlayers(prev => ({ ...prev, [id]: !prev[id] }))}
                        containerStyle={styles.checkBox}
                        textStyle={styles.checkBoxText}
                    />
                ))}
            </View>

            {/* Stats table */}
            {columns.length === 0 ? (
                <Text style={styles.empty}>Select at least one team or player above.</Text>
            ) : (
                <View style={styles.table}>
                    {/* Header row */}
                    <View style={styles.tableRow}>
                        <View style={[styles.tableCell, styles.headerCell, styles.labelCell]}>
                            <Text style={styles.headerText}> </Text>
                        </View>
                        {columns.map(col => (
                            <View key={col.label} style={[styles.tableCell, styles.headerCell]}>
                                <Text style={styles.headerText}>{col.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Data rows */}
                    {STAT_ROWS.map(row => (
                        <View key={row.key} style={styles.tableRow}>
                            <View style={[styles.tableCell, styles.labelCell]}>
                                <Text style={styles.labelText}>{row.label}</Text>
                            </View>
                            {columns.map(col => (
                                <View key={col.label + row.key} style={styles.tableCell}>
                                    <Text style={styles.cellText}>{col.stats[row.key]}</Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    scrollContainer: {
        padding: 12,
    },
    empty: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 40,
        opacity: 0.6,
    },
    filterTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 2,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    checkBox: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: 4,
        paddingVertical: 2,
        marginHorizontal: 0,
    },
    checkBoxText: {
        fontSize: 14,
        fontWeight: '400',
    },
    table: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        overflow: 'hidden',
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableCell: {
        flex: 1,
        minWidth: 70,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderRightWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCell: {
        backgroundColor: '#2089dc',
    },
    headerText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    labelCell: {
        flex: 1.2,
        alignItems: 'flex-start',
    },
    labelText: {
        fontSize: 13,
        fontWeight: '500',
    },
    cellText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
