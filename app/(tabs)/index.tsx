import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Platform, TouchableOpacity, TextInput, ScrollView, Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Canvas, useImage, Image } from '@shopify/react-native-skia';
import { configureReanimatedLogger, ReanimatedLogLevel, useSharedValue } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

import type { Game, TouchIndex, Score, FieldConstants, AnimRefs } from '@/utils/types';
import {
  createGame, calculateScore, isSideSwapped, getTouch, isLastTouchIndex,
  getPrevTouch, getNextTouch, getPrevPoint, getNextPoint,
  deleteLastTouch, scorePoint, addLineEvent,
  otherTeam, otherPlayerId, teamOfPlayer, teamById,
  clampBallX, clampBallY, clampPlayerX, clampPlayerY, dist,
  updateTouchStats, recalculateAllStats,
} from '@/utils/gameEngine';
import {
  setupServe, setupReceive, setupSet, setupAttack, setupGroundHit, animateTouch,
} from '@/utils/rendering';
import { sampleGame, newGame } from '@/utils/sampleGame';
import { useGameContext } from '@/utils/GameContext';

// @ts-ignore
import BallImg from '@/assets/sprites/ball.png';
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
// @ts-ignore
import FinlandFlagImg from '@/assets/sprites/finland_flag.png';
// @ts-ignore
import BrazilFlagImg from '@/assets/sprites/brazil_flag.png';

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

// ─── Field constants ────────────────────────────────────
const W = 720;
const H = 370;
const BALL = W / 10;
const PLAYER = W / 10;

const FC: FieldConstants = {
  width: W, height: H, ballSize: BALL, playerSize: PLAYER,
  servingX: 0, servingY: H / 4,
  serverMateX: 3 * W / 8, serverMateY: H / 2,
  blockingX: 3 * W / 8,
  defenderX: W / 7, defenderY: 3 * H / 4,
  receiverX: W / 7, receiverY: H / 4,
  approachX: W / 3,
};

export default function GameScreen() {
  // ─── Images ─────────────────────────────────────────────
  const ball = useImage(BallImg.uri);
  const field = useImage(FieldImg.uri);
  const spriteMap: Record<string, ReturnType<typeof useImage>> = {
    Taru: useImage(TaruImg.uri),
    Niina: useImage(NiinaImg.uri),
    Jeff: useImage(JeffImg.uri),
    Domna: useImage(DomnaImg.uri),
    AnaPatricia: useImage(AnaPatriciaImg.uri),
    Duda: useImage(DudaImg.uri),
    male: useImage(MaleImg.uri),
    Bennett: useImage(BennettImg.uri),
  };
  const finlandFlag = useImage(FinlandFlagImg.uri);
  const brazilFlag = useImage(BrazilFlagImg.uri);

  // ─── Shared animation values ────────────────────────────
  const ballX = useSharedValue(clampBallX(W / 7, FC));
  const ballY = useSharedValue(clampBallY(H / 2, FC));

  // One pair of SharedValues per known player sprite
  const allPlayerSVs: Record<string, { x: ReturnType<typeof useSharedValue<number>>; y: ReturnType<typeof useSharedValue<number>> }> = {
    Jeff:        { x: useSharedValue(clampPlayerX(0, FC)),         y: useSharedValue(clampPlayerY(H / 4, FC)) },
    Domna:       { x: useSharedValue(clampPlayerX(3 * W / 8, FC)),y: useSharedValue(clampPlayerY(H / 2, FC)) },
    male:        { x: useSharedValue(clampPlayerX(W / 7, FC)),    y: useSharedValue(clampPlayerY(H / 4, FC)) },
    AnaPatricia: { x: useSharedValue(clampPlayerX(W / 7, FC)),    y: useSharedValue(clampPlayerY(H / 4, FC)) },
    Niina:       { x: useSharedValue(clampPlayerX(0, FC)),         y: useSharedValue(clampPlayerY(H / 4, FC)) },
    Taru:        { x: useSharedValue(clampPlayerX(3 * W / 8, FC)),y: useSharedValue(clampPlayerY(H / 2, FC)) },
    Duda:        { x: useSharedValue(clampPlayerX(W / 7, FC)),    y: useSharedValue(clampPlayerY(3 * H / 4, FC)) },
    Bennett:     { x: useSharedValue(clampPlayerX(W / 7, FC)),    y: useSharedValue(clampPlayerY(3 * H / 4, FC)) },
  };

  // Build AnimRefs from the game's actual 4 players
  const buildRefs = (g: Game): AnimRefs => {
    const playerIds = g.teams.flatMap((t: { playerIds: string[] }) => t.playerIds);
    const players: Record<string, { x: ReturnType<typeof useSharedValue<number>>; y: ReturnType<typeof useSharedValue<number>> }> = {};
    for (const id of playerIds) {
      players[id] = allPlayerSVs[id] || allPlayerSVs['male']; // fallback
    }
    return { ballX, ballY, players };
  };

  const [refs, setRefs] = useState<AnimRefs>(() => buildRefs(JSON.parse(JSON.stringify(sampleGame))));

  // ─── Game state ─────────────────────────────────────────
  const [game, setGameLocal] = useState<Game>(() => JSON.parse(JSON.stringify(sampleGame)));
  const [currentIdx, setCurrentIdx] = useState<TouchIndex>(() => {
    const g = JSON.parse(JSON.stringify(sampleGame)) as Game;
    return { pointIdx: Math.max(0, g.points.length - 1), rallyIdx: 0, touchIdx: 0 };
  });
  const [score, setScore] = useState<Score>(() => {
    const g = JSON.parse(JSON.stringify(sampleGame)) as Game;
    return calculateScore(g, Math.max(0, g.points.length - 1));
  });
  const [isEdit, setIsEdit] = useState(false);
  const _initLastPt = sampleGame.points[sampleGame.points.length - 1];
  const [invertSideSwap, setInvertSideSwap] = useState(_initLastPt?.invertSideSwap ?? false);
  const [invertServingTeam, setInvertServingTeam] = useState(_initLastPt?.invertServingTeam ?? false);
  const [invertServingPlayer, setInvertServingPlayer] = useState(_initLastPt?.invertServingPlayer ?? false);
  const [groundHitMode, setGroundHitMode] = useState(false);
  const [log, setLog] = useState<string[]>(['Ready']);

  const { setGame: setSharedGame, setScore: setSharedScore, setCurrentIdx: setSharedIdx } = useGameContext();

  const addLog = useCallback((msg: string) => {
    console.log(msg);
    setLog(prev => [...prev.slice(-4), msg]);
  }, []);

  // Sync to context
  useEffect(() => {
    setSharedGame(game);
    setSharedScore(score);
    setSharedIdx(currentIdx);
  }, [game, score, currentIdx]);

  // Initialize on mount
  useEffect(() => {
    recalculateAllStats(game, FC);
    if (game.points.length) {
      const idx: TouchIndex = { pointIdx: game.points.length - 1, rallyIdx: 0, touchIdx: 0 };
      setCurrentIdx(idx);
      setScore(calculateScore(game, idx.pointIdx));
      // Check if we're at the last touch
      if (isLastTouchIndex(game, idx)) setIsEdit(true);
      animateTouch(refs, game, idx, FC);
    } else {
      setIsEdit(true);
      setupServe(refs, game, 0, FC);
    }
  }, []);

  // ─── Handlers ───────────────────────────────────────────

  const doScore = (teamSideIdx: number) => {
    // teamSideIdx: 0=team0, 1=team1
    const scoringTeamId = game.teams[teamSideIdx].id;
    scorePoint(game, scoringTeamId, FC);

    const newPointIdx = game.points.length; // will be the new point
    const newScore = calculateScore(game, newPointIdx);

    // Push new empty point
    game.points.push({
      set: newScore.setsTeam[0] + newScore.setsTeam[1],
      rallies: [],
      invertSideSwap,
      invertServingTeam: false,
      invertServingPlayer,
    });

    const newIdx = setupServe(refs, game, newPointIdx, FC, invertServingPlayer);
    setCurrentIdx(newIdx);
    setScore(newScore);
    setIsEdit(true);
    setInvertServingTeam(false);
    setGameLocal({ ...game });
    addLog(`${scoringTeamId} scores! ${newScore.scoreTeam[0]}-${newScore.scoreTeam[1]}`);
  };

  const onFieldTap = (x: number, y: number) => {
    if (!isEdit) { addLog('Not in edit mode'); return; }

    // Ground hit mode
    if (groundHitMode) {
      const newIdx = setupGroundHit(refs, game, currentIdx, x, y, FC);
      setCurrentIdx(newIdx);
      setGameLocal({ ...game });
      setGroundHitMode(false);
      addLog('Ground hit recorded');
      return;
    }

    const point = game.points[currentIdx.pointIdx];
    if (!point || !point.rallies.length) return;
    const rally = point.rallies[point.rallies.length - 1];
    const lastTouch = rally.touches[rally.touches.length - 1];
    if (!lastTouch) return;

    // Determine which side the current rally's team is on (from player positions, not ball)
    const rallyTeam = teamById(game, rally.teamId);
    const teamPlayerSv = refs.players[rallyTeam.playerIds[0]];
    const teamIsOnRight = teamPlayerSv ? teamPlayerSv.x.value > W / 2 : lastTouch.ballX > W / 2;
    const crossesNet = (x > W / 2) !== teamIsOnRight;

    switch (lastTouch.type) {
      case 'serve':
        if (crossesNet) {
          // Service crosses → create new rally for receiving team
          const servTeamId = rally.teamId;
          const recvTeamId = otherTeam(game, servTeamId).id;
          point.rallies.push({ teamId: recvTeamId, touches: [] });
          const newIdx = setupReceive(refs, game, currentIdx, x, y, FC);
          setCurrentIdx(newIdx);
          addLog('Serve → Pass');
        } else {
          addLog('Serve stays same side — tap score or serve again');
        }
        break;

      case 'pass':
        if (!crossesNet) {
          const newIdx = setupSet(refs, game, currentIdx, x, y, FC);
          setCurrentIdx(newIdx);
          addLog('Pass → Set');
        } else {
          // Cross net
          const recvTeamId = otherTeam(game, rally.teamId).id;
          point.rallies.push({ teamId: recvTeamId, touches: [] });
          const newIdx = setupReceive(refs, game, currentIdx, x, y, FC);
          setCurrentIdx(newIdx);
          addLog('Pass → Pass (cross net)');
        }
        break;

      case 'set':
        if (!crossesNet) {
          const newIdx = setupAttack(refs, game, currentIdx, x, y, FC);
          setCurrentIdx(newIdx);
          addLog('Set → Attack');
        } else {
          const recvTeamId = otherTeam(game, rally.teamId).id;
          point.rallies.push({ teamId: recvTeamId, touches: [] });
          const newIdx = setupReceive(refs, game, currentIdx, x, y, FC);
          setCurrentIdx(newIdx);
          addLog('Set → Pass (cross net)');
        }
        break;

      case 'attack':
        if (crossesNet) {
          const recvTeamId = otherTeam(game, rally.teamId).id;
          point.rallies.push({ teamId: recvTeamId, touches: [] });
          const newIdx = setupReceive(refs, game, currentIdx, x, y, FC);
          setCurrentIdx(newIdx);
          addLog('Attack → Pass (cross net)');
        } else {
          // 4th touch / attack fail
          const losingTeamIdx = game.teams[0].id === rally.teamId ? 0 : 1;
          doScore(1 - losingTeamIdx);
        }
        break;

      case 'ground':
        addLog('Ground hit — score the point');
        break;
    }
    setGameLocal({ ...game });
  };

  const gotoMove = (dir: 'prevPt' | 'prev' | 'next' | 'nextPt') => {
    let newIdx: TouchIndex | null = null;
    switch (dir) {
      case 'prevPt': newIdx = getPrevPoint(game, currentIdx); break;
      case 'prev': newIdx = getPrevTouch(game, currentIdx); break;
      case 'next': newIdx = getNextTouch(game, currentIdx); break;
      case 'nextPt': newIdx = getNextPoint(game, currentIdx); break;
    }
    if (!newIdx) { addLog('No more touches'); return; }
    setCurrentIdx(newIdx);
    setScore(calculateScore(game, newIdx.pointIdx));
    setIsEdit(isLastTouchIndex(game, newIdx));
    // Sync invert flags when navigating to a different point
    if (newIdx.pointIdx !== currentIdx.pointIdx) {
      const pt = game.points[newIdx.pointIdx];
      setInvertSideSwap(pt?.invertSideSwap ?? false);
      setInvertServingTeam(pt?.invertServingTeam ?? false);
      setInvertServingPlayer(pt?.invertServingPlayer ?? false);
    }
    animateTouch(refs, game, newIdx, FC);
    const t = getTouch(game, newIdx);
    if (t) {
      const suffix = `${t.isFail ? ' (failed)' : ''}${t.isScoring ? ' (scores)' : ''}`;
      addLog(`${t.type}${t.playerId ? ' by ' + t.playerId : ' (ground)'}${suffix}`);
    }
  };

  const doDelete = () => {
    const newIdx = deleteLastTouch(game);
    setCurrentIdx(newIdx);
    setScore(calculateScore(game, newIdx.pointIdx));
    setIsEdit(true);
    setGroundHitMode(false);
    // Sync invert flags from the (possibly different) current point
    const pt = game.points[newIdx.pointIdx];
    setInvertSideSwap(pt?.invertSideSwap ?? false);
    setInvertServingTeam(pt?.invertServingTeam ?? false);
    setInvertServingPlayer(pt?.invertServingPlayer ?? false);
    if (game.points.length && pt?.rallies.length) {
      animateTouch(refs, game, newIdx, FC);
    } else {
      setupServe(refs, game, newIdx.pointIdx, FC, pt?.invertServingPlayer ?? false);
    }
    setGameLocal({ ...game });
    addLog('Deleted last touch');
  };

  const doNewGame = () => {
    const g: Game = JSON.parse(JSON.stringify(newGame));
    recalculateAllStats(g, FC);
    const newRefs = buildRefs(g);
    setRefs(newRefs);
    setGameLocal(g);
    const hasPoints = g.points.length > 0;
    const idx: TouchIndex = hasPoints
      ? { pointIdx: g.points.length - 1, rallyIdx: 0, touchIdx: 0 }
      : { pointIdx: 0, rallyIdx: 0, touchIdx: 0 };
    setCurrentIdx(idx);
    setScore(hasPoints ? calculateScore(g, idx.pointIdx) : { scoreTeam: [0, 0], setsTeam: [0, 0] });
    setIsEdit(!hasPoints || isLastTouchIndex(g, idx));
    setGroundHitMode(false);
    const lastPt = hasPoints ? g.points[g.points.length - 1] : undefined;
    setInvertSideSwap(lastPt?.invertSideSwap ?? false);
    setInvertServingTeam(lastPt?.invertServingTeam ?? false);
    setInvertServingPlayer(lastPt?.invertServingPlayer ?? false);
    if (hasPoints) {
      animateTouch(newRefs, g, idx, FC);
    } else {
      setupServe(newRefs, g, 0, FC);
    }
    addLog('New game: ' + g.title);
  };

  const doExport = async () => {
    const json = JSON.stringify(game, null, 2);
    const name = `${(game.title || 'game').replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } else {
      const uri = FileSystem.documentDirectory + name;
      await FileSystem.writeAsStringAsync(uri, json);
      await Sharing.shareAsync(uri, { mimeType: 'application/json' });
    }
    addLog('Exported ' + name);
  };

  const doImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (res.canceled) return;
      let jsonStr: string;
      if (Platform.OS === 'web') {
        jsonStr = await (await fetch(res.assets[0].uri)).text();
      } else {
        jsonStr = await FileSystem.readAsStringAsync(res.assets[0].uri);
      }
      const loaded = JSON.parse(jsonStr) as Game;
      recalculateAllStats(loaded, FC);
      const newRefs = buildRefs(loaded);
      setRefs(newRefs);
      setGameLocal(loaded);
      const idx: TouchIndex = { pointIdx: Math.max(0, loaded.points.length - 1), rallyIdx: 0, touchIdx: 0 };
      setCurrentIdx(idx);
      setScore(calculateScore(loaded, idx.pointIdx));
      setIsEdit(isLastTouchIndex(loaded, idx));
      setGroundHitMode(false);
      const lastPt = loaded.points.length ? loaded.points[loaded.points.length - 1] : undefined;
      setInvertSideSwap(lastPt?.invertSideSwap ?? false);
      setInvertServingTeam(lastPt?.invertServingTeam ?? false);
      setInvertServingPlayer(lastPt?.invertServingPlayer ?? false);
      if (loaded.points.length) animateTouch(newRefs, loaded, idx, FC);
      addLog('Imported ' + (loaded.title || 'game'));
    } catch (e: any) {
      addLog('Import error: ' + (e.message || e));
    }
  };

  const onLineEvent = (isLeft: boolean, event: string) => {
    const scoringTeamId = addLineEvent(game, currentIdx, isLeft, event, FC);
    const ti = game.teams[0].id === scoringTeamId ? 0 : 1;
    doScore(ti);
  };

  const onSwapSides = () => {
    const v = !invertSideSwap;
    setInvertSideSwap(v);
    if (game.points.length) game.points[game.points.length - 1].invertSideSwap = v;
    if (game.points[currentIdx.pointIdx]?.rallies[0]?.touches.length) {
      const servTeamId = game.points[currentIdx.pointIdx].rallies[0].teamId;
      setupServe(refs, game, currentIdx.pointIdx, FC, invertServingPlayer);
    }
  };

  const onSwapServingTeam = () => {
    const v = !invertServingTeam;
    setInvertServingTeam(v);
    if (game.points.length) {
      const pt = game.points[game.points.length - 1];
      pt.invertServingTeam = v;
      pt.rallies = [];
      setupServe(refs, game, currentIdx.pointIdx, FC, invertServingPlayer);
      setCurrentIdx({ ...currentIdx, rallyIdx: 0, touchIdx: 0 });
    }
  };

  const onSwapServingPlayer = () => {
    const v = !invertServingPlayer;
    setInvertServingPlayer(v);
    if (game.points.length) {
      const pt = game.points[game.points.length - 1];
      pt.invertServingPlayer = v;
      pt.rallies = [];
      setupServe(refs, game, currentIdx.pointIdx, FC, v);
      setCurrentIdx({ ...currentIdx, rallyIdx: 0, touchIdx: 0 });
    }
  };

  const onSwapReceiver = () => {
    const point = game.points[currentIdx.pointIdx];
    if (!point) return;
    const rally = point.rallies[currentIdx.rallyIdx];
    if (!rally?.touches.length) return;
    const recvId = rally.touches[0].playerId;
    if (!recvId) return;
    const team = teamOfPlayer(game, recvId);
    const newRecvId = otherPlayerId(team, recvId);
    const prevIdx = getPrevTouch(game, currentIdx);
    setupReceive(refs, game, currentIdx, rally.touches[0].ballX, rally.touches[0].ballY, FC, newRecvId);
    addLog('Swapped receiver to ' + newRecvId);
  };

  // ─── Gestures ───────────────────────────────────────────
  const isDnDId = useSharedValue('-2');
  const isLeftSide = useSharedValue(true);

  const tapGesture = Gesture.Tap().onStart((e) => onFieldTap(e.x, e.y));

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (isDnDId.value === '-2') {
        // Discover closest draggable
        const bDist = dist(ballX.value, ballY.value, clampBallX(e.x, FC), clampBallY(e.y, FC));
        let closestId = '';
        let closestDist = Infinity;
        for (const [pid, sv] of Object.entries(refs.players)) {
          const d = dist(sv.x.value, sv.y.value, clampPlayerX(e.x, FC), clampPlayerY(e.y, FC));
          if (d < closestDist) { closestDist = d; closestId = pid; }
        }
        const MIN_D = 50;
        if (MIN_D > bDist && closestDist > bDist) {
          isLeftSide.value = ballX.value < W / 2;
          isDnDId.value = '-1';
        } else if (MIN_D > closestDist && bDist > closestDist) {
          isLeftSide.value = refs.players[closestId].x.value < W / 2;
          isDnDId.value = closestId;
        }
      } else if (isLeftSide.value === (e.x < W / 2)) {
        if (isDnDId.value === '-1') {
          ballX.value = clampBallX(e.x, FC);
          ballY.value = clampBallY(e.y, FC);
        } else {
          const sv = refs.players[isDnDId.value];
          if (sv) {
            sv.x.value = clampPlayerX(e.x, FC);
            sv.y.value = clampPlayerY(e.y, FC);
          }
        }
      }
    })
    .onEnd((e) => {
      const touch = getTouch(game, currentIdx);
      if (touch && isDnDId.value === '-1') {
        touch.ballX = clampBallX(e.x, FC);
        touch.ballY = clampBallY(e.y, FC);
      } else if (touch && isDnDId.value !== '-2') {
        touch.explicitPositions = touch.explicitPositions.filter(p => p.id !== isDnDId.value);
        touch.explicitPositions.push({
          id: isDnDId.value,
          x: clampPlayerX(e.x, FC),
          y: clampPlayerY(e.y, FC),
        });
        const prevIdx = getPrevTouch(game, currentIdx);
        updateTouchStats(game, currentIdx, FC);
      }
      isDnDId.value = '-2';
    });

  const gesture = Gesture.Race(tapGesture, panGesture);

  // ─── Resolve player images ──────────────────────────────
  const pImg = (id: string) => spriteMap[id] || spriteMap['male'];

  // ─── Loading check ──────────────────────────────────────
  if (!ball || !field || !finlandFlag || !brazilFlag) {
    return <View style={s.center}><Text style={s.loadingText}>Loading...</Text></View>;
  }

  // ─── Replay mode ────────────────────────────────────────
  if (!isEdit && !isLastTouchIndex(game, currentIdx)) {
    // Stay in replay
  } else if (!isEdit && isLastTouchIndex(game, currentIdx)) {
    setIsEdit(true);
  }

  // ─── Current touch info ─────────────────────────────────
  const curTouch = getTouch(game, currentIdx);
  const touchLabel = curTouch
    ? `${curTouch.type}${curTouch.playerId ? ' by ' + curTouch.playerId : ' (ground)'}${curTouch.isFail ? ' (failed)' : ''}${curTouch.isScoring ? ' (scores)' : ''}`
    : 'No touch';
  const isServing = currentIdx.rallyIdx === 0 && currentIdx.touchIdx === 0;

  const p0 = game.teams[0].playerIds;
  const p1 = game.teams[1].playerIds;

  return (
    <ScrollView contentContainerStyle={s.root}>
      {/* ─── Title ─── */}
      <TextInput
        style={s.title}
        value={game.title}
        onChangeText={t => { game.title = t; setGameLocal({ ...game }); }}
        placeholder="Game title"
      />

      {/* ─── Score bar ─── */}
      <View style={s.scoreBar}>
        <Canvas style={s.flag}><Image image={finlandFlag} width={40} height={24} fit="cover" /></Canvas>
        <TouchableOpacity style={s.scoreBtn} onPress={() => doScore(0)}>
          <Text style={s.scoreTxt}>{score.scoreTeam[0]}</Text>
        </TouchableOpacity>
        <View style={s.setsBox}>
          <Text style={s.setsTxt}>{score.setsTeam[0]} - {score.setsTeam[1]}</Text>
        </View>
        <TouchableOpacity style={s.scoreBtn} onPress={() => doScore(1)}>
          <Text style={s.scoreTxt}>{score.scoreTeam[1]}</Text>
        </TouchableOpacity>
        <Canvas style={s.flag}><Image image={brazilFlag} width={40} height={24} fit="cover" /></Canvas>
      </View>

      {/* ─── Line events ─── */}
      <View style={s.lineRow}>
        {(['OUT', 'Touch', 'IN', 'Net'].map((label, i) => (
          <TouchableOpacity key={'l' + i} style={[s.lineBtn, { backgroundColor: i < 2 ? '#e74c3c' : '#27ae60' }]}
            onPress={() => onLineEvent(true, label === 'Touch' ? 'OUT touched' : label === 'Net' ? 'Net fault' : label)}>
            <Text style={s.lineTxt}>{label}</Text>
          </TouchableOpacity>
        )))}
        <View style={s.lineSep} />
        {(['Net', 'IN', 'Touch', 'OUT'].map((label, i) => (
          <TouchableOpacity key={'r' + i} style={[s.lineBtn, { backgroundColor: i > 1 ? '#e74c3c' : '#27ae60' }]}
            onPress={() => onLineEvent(false, label === 'Touch' ? 'OUT touched' : label === 'Net' ? 'Net fault' : label)}>
            <Text style={s.lineTxt}>{label}</Text>
          </TouchableOpacity>
        )))}
      </View>

      {/* ─── Canvas ─── */}
      <GestureDetector gesture={gesture}>
        <Canvas style={{ width: W, height: H }}>
          <Image image={field} width={W} height={H} fit="cover" />
          <Image image={ball} width={BALL} height={BALL} fit="cover" x={ballX} y={ballY} />
          <Image image={pImg(p0[0])} width={PLAYER} height={PLAYER} fit="cover" x={refs.players[p0[0]].x} y={refs.players[p0[0]].y} />
          <Image image={pImg(p0[1])} width={PLAYER} height={PLAYER} fit="cover" x={refs.players[p0[1]].x} y={refs.players[p0[1]].y} />
          <Image image={pImg(p1[0])} width={PLAYER} height={PLAYER} fit="cover" x={refs.players[p1[0]].x} y={refs.players[p1[0]].y} />
          <Image image={pImg(p1[1])} width={PLAYER} height={PLAYER} fit="cover" x={refs.players[p1[1]].x} y={refs.players[p1[1]].y} />
        </Canvas>
      </GestureDetector>

      {/* ─── Touch info ─── */}
      <View style={s.infoBar}>
        <Text style={s.infoTxt}>Pt {currentIdx.pointIdx + 1} • {touchLabel}</Text>
      </View>


      {/* ─── Navigation ─── */}
      <View style={s.navRow}>
        <NavBtn label="⏮" onPress={() => gotoMove('prevPt')} />
        <NavBtn label="◀" onPress={() => gotoMove('prev')} />
        <NavBtn label="▶" onPress={() => gotoMove('next')} />
        <NavBtn label="⏭" onPress={() => gotoMove('nextPt')} />
      </View>

      {/* ─── Action buttons ─── */}
      <View style={s.actionRow}>
        {isEdit && (
          <ActionBtn label="🏐 Ground Hit" color={groundHitMode ? '#e67e22' : '#7f8c8d'}
            onPress={() => setGroundHitMode(!groundHitMode)} />
        )}
        {isEdit && isLastTouchIndex(game, currentIdx) && (
          <ActionBtn label="🗑️ Undo" color="#cc3333" onPress={doDelete} />
        )}
        <ActionBtn label="🆕 New" color="#2089dc" onPress={doNewGame} />
        <ActionBtn label="📂 Import" color="#2089dc" onPress={doImport} />
        <ActionBtn label="💾 Export" color="#2089dc" onPress={doExport} />
      </View>

      {/* ─── Log ─── */}
      <View style={s.logBox}>
        {log.map((l, i) => <Text key={i} style={s.logTxt}>{l}</Text>)}
      </View>

        {/* ─── Swap controls (only when editing a serve) ─── */}
        {isEdit && isServing && (
            <View style={s.swapRow}>
                <Pill label="⇄ Sides" active={invertSideSwap} onPress={onSwapSides} />
                <Pill label="⇄ Team" active={invertServingTeam} onPress={onSwapServingTeam} />
                <Pill label="⇄ Player" active={invertServingPlayer} onPress={onSwapServingPlayer} />
            </View>
        )}

        {/* ─── Swap receiver (when editing a receive) ─── */}
        {isEdit && currentIdx.rallyIdx > 0 && currentIdx.touchIdx === 0 && (
            <View style={s.swapRow}>
                <Pill label="🔄 Swap Receiver" active={false} onPress={onSwapReceiver} />
            </View>
        )}
    </ScrollView>
  );
}

// ─── Small components ───────────────────────────────────

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.pill, active && s.pillActive]} onPress={onPress}>
      <Text style={[s.pillTxt, active && s.pillTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function NavBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.navBtn} onPress={onPress}>
      <Text style={s.navTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.actionBtn, { backgroundColor: color }]} onPress={onPress}>
      <Text style={s.actionTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 24,
    backgroundColor: '#f5f6fa',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 18, color: '#666' },

  title: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    minWidth: 460,
    backgroundColor: '#fff',
    borderRadius: 6,
  },

  // Score
  scoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  flag: { width: 40, height: 24 },
  scoreBtn: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  scoreTxt: { color: '#fff', fontSize: 28, fontWeight: '800' },
  setsBox: { paddingHorizontal: 8 },
  setsTxt: { fontSize: 14, color: '#888', fontWeight: '600' },

  // Line events
  lineRow: {
    flexDirection: 'row',
    gap: 3,
    marginVertical: 4,
    alignItems: 'center',
  },
  lineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  lineTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  lineSep: { width: 8 },

  // Info
  infoBar: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  infoTxt: { fontSize: 13, color: '#34495e' },

  // Swaps
  swapRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    backgroundColor: '#fff',
  },
  pillActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
  pillTxt: { fontSize: 12, color: '#555' },
  pillTxtActive: { color: '#fff' },

  // Navigation
  navRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  navBtn: {
    backgroundColor: '#34495e',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navTxt: { color: '#fff', fontSize: 22 },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Log
  logBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: W,
  },
  logTxt: { fontSize: 11, color: '#7f8c8d', lineHeight: 16 },
});

