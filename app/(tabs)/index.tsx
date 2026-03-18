import { useState, useEffect } from 'react';
import { ButtonGroup, CheckBox, Text} from '@rneui/themed'

import { StyleSheet, View, Platform, TouchableOpacity, TextInput  } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {Canvas, useImage, Image} from "@shopify/react-native-skia";
import {configureReanimatedLogger, ReanimatedLogLevel, useSharedValue} from "react-native-reanimated";
import {
    GestureDetector,
    Gesture,
    GestureStateChangeEvent,
    TapGestureHandlerEventPayload
} from "react-native-gesture-handler";

import {
    initGame,
    initTeams,
    renderServingPosition,
    renderReceivingPosition,
    renderSettingPosition,
    renderAttackPosition,
    Player,
    Score, Game, SerializedGame,
    getOtherTeam,
    getOtherPlayer,
    FieldGraphicConstants,
    TouchIndex,
    isLastTouchIndex,
    renderTouchIndex,
    getNextPointIndex,
    getNextTouchIndex, getPreviousTouchIndex, getPreviousPointIndex,
    calculateScore,updateTouchStats, getSuccessAndFail,
    isSideSwapped, addLineEvent, getClosestPlayer, getDistance, getTouch, CalculatedPlayer,
    searchSimilarTouches,
    Point
} from '@/utils/BeachVolleyUtils';
import { presetGame } from '@/utils/sampleGame';
import { useGameContext } from '@/utils/GameContext';

// @ts-ignore
import BallFront from '@/assets/sprites/ball.png';
// @ts-ignore
import FieldFront from '@/assets/sprites/field.jpg';
// @ts-ignore
import TaruFront from '@/assets/sprites/Taru.png';
// @ts-ignore
import NiinaFront from '@/assets/sprites/Niina.jpg';
// @ts-ignore
import JeffFront from '@/assets/sprites/Jeff.jpg';
// @ts-ignore
import DomnaFront from '@/assets/sprites/Domna.jpg';
// @ts-ignore
import AnaPatriciaFront from '@/assets/sprites/AnaPatricia.png';
// @ts-ignore
import DudaFront from '@/assets/sprites/Duda.jpg';
// @ts-ignore
import MaleFront from '@/assets/sprites/male.png';
// @ts-ignore
import finlandFlagFront from '@/assets/sprites/finland_flag.png';
// @ts-ignore
import brazilFlagFront from '@/assets/sprites/brazil_flag.png';


// This is the default configuration
configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false, // Reanimated runs in strict mode by default
});

export default function TabTwoScreen() {
    //const windowWidth = useWindowDimensions().width;
    //const windowHeight = useWindowDimensions().height;
    const width = 720;
    const height = 370;
    const ballsize = width/10;
    const playerSize = width/10;

    const servingPosX = 0;
    const servingPosY = height/4;
    const serverMateX = 3*width/8;
    const blockingX = serverMateX;
    const serverMateY = height/2;
    const serverBlockerMateX = width/7;
    const serverBlockerMateY = 3*height/4;
    const receiverX = 6*width/7;
    const receiverY = height/4;
    const approachX = width/3;

    //const sideOutState          = useSharedValue('service'); // pass, set, attack.
    const [ lastServingTeam, setLastServingTeam ] = useState(0); // 0 = finland, 1 = brazil
    const [ debugText, setDebugText ] = useState(["debug...","?","?","?","?","?"]); // 0 = finland, 1 = brazil

    const logToUI = (textToLog : string) => {
        console.log(textToLog)
        debugText.push(textToLog)
        setDebugText(JSON.parse(JSON.stringify(debugText)))
    };

    const validateBallX =   (oneBallX : number) => Math.min(Math.max(0,oneBallX-ballsize/2), width-ballsize)
    const validateBallY =   (oneBallY : number) => Math.min(Math.max(0,oneBallY-ballsize/2), height-ballsize)
    const validatePlayerX = (onePlayerX : number) => Math.min(Math.max(0,onePlayerX-playerSize/2), width-playerSize)
    const validatePlayerY = (onePlayerY : number) => Math.min(Math.max(0,onePlayerY-playerSize/2), height-playerSize)

    const fieldGraphicConstants = {
        width: width,
        height: height,
        ballsize: ballsize,
        servingPosX: servingPosX,
        servingPosY: servingPosY,
        blockingX: blockingX,
        serverMateX: serverMateX,
        serverMateY: serverMateY,
        serverBlockerMateX: serverBlockerMateX,
        serverBlockerMateY: serverBlockerMateY,
        receiverX: receiverX,
        receiverY: receiverY,
        approachX: approachX,
        validateBallX: validateBallX,
        validateBallY: validateBallY,
        validatePlayerX: validatePlayerX,
        validatePlayerY: validatePlayerY
    } as FieldGraphicConstants;

    const ball = useImage(BallFront.uri,
         (error :Error)=> {
           console.error('Loading failed:', error.message);
         }
    );
    const field = useImage(FieldFront.uri,
        (error :Error)=> {
            console.error('Loading failed:', error.message);
        }
    );
    const taru = useImage(TaruFront.uri,
        (error :Error)=> {
            console.error('Loading failed:', error.message);
        }
    );
    const niina = useImage(NiinaFront.uri,
        (error :Error)=> {
            console.error('Loading failed:', error.message);
        }
    );
    const anaPatricia = useImage(AnaPatriciaFront.uri,
        (error :Error)=> {
            console.error('Loading failed:', error.message);
        }
    );
    const duda = useImage(DudaFront.uri,
        (error :Error)=> {
            console.error('Loading failed:', error.message);
        }
    );
    const jeff = useImage(JeffFront.uri,
        (error :Error)=> {
            console.error('Loading failed:', error.message);
        }
    );
    const domna = useImage(DomnaFront.uri,
        (error :Error)=> {
            console.error('Loading failed:', error.message);
        }
    );
    const male = useImage(MaleFront.uri,
        (error :Error)=> {
            console.error('Loading failed:', error.message);
        }
    );
    const finlandFlag = useImage(finlandFlagFront.uri,
        (error :Error)=> {
            console.error('Loading failed:', error.message);
        }
    );
    const brazilFlag = useImage(brazilFlagFront.uri,
        (error :Error)=> {
            console.error('Loading failed:', error.message);
        }
    );

    const ballX = useSharedValue(validateBallX(width/7))
    const ballY = useSharedValue(validateBallY(height/2))
    const taruX = useSharedValue(validatePlayerX(servingPosX))
    const taruY = useSharedValue(validatePlayerY(servingPosY))
    const niinaX = useSharedValue(validatePlayerX(width/7))
    const niinaY = useSharedValue(validatePlayerY(3*height/4))
    const anaPatriciaX = useSharedValue(validatePlayerX(6*width/7))
    const anaPatriciaY = useSharedValue(validatePlayerY(height/4))
    const dudaX = useSharedValue(validatePlayerX(6*width/7))
    const dudaY = useSharedValue(validatePlayerY(3*height/4))

    let teams = initTeams(
        {id:"Niina", playerX:niinaX, playerY:niinaY} as Player,
        {id:"Taru", playerX:taruX, playerY:taruY} as Player,
        {id:"AnaPatricia", playerX:anaPatriciaX, playerY:anaPatriciaY} as Player,
        {id:"Duda", playerX:dudaX, playerY:dudaY} as Player,
        "Finland1",
        "Brazil1"
    );

    const [ game, setGame ] = useState(initGame(
        ballX,
        ballY,
        teams
    ,presetGame
    ));

    // Keep local teams in sync with game.teams (which may have been updated by import/newGame)
    if (game.teams) {
        teams[0].id = game.teams[0].id;
        teams[0].players[0].id = game.teams[0].players[0].id;
        teams[0].players[1].id = game.teams[0].players[1].id;
        teams[0].startingSide = game.teams[0].startingSide;
        teams[0].prefersBlockId = game.teams[0].prefersBlockId;
        teams[1].id = game.teams[1].id;
        teams[1].players[0].id = game.teams[1].players[0].id;
        teams[1].players[1].id = game.teams[1].players[1].id;
        teams[1].startingSide = game.teams[1].startingSide;
        teams[1].prefersBlockId = game.teams[1].prefersBlockId;
    }
    //logToUI("BallFront ", JSON.stringify(BallFront))

    const initialTouchIdx = {
        pointIdx: game.points.length ? game.points.length - 1 : 0,
        teamTouchesIdx: 0,
        touchIdx: 0
    } as TouchIndex;
    const [ isEditMode, setIsEditMode ] = useState(!game.points.length)
    const [ currentTouchIdx, setCurrentTouchIdx ] = useState(initialTouchIdx);
    const [ score, setScore ] = useState(
        game.points.length
            ? calculateScore(game, initialTouchIdx)
            : { scoreTeam: [0,0], setsTeam: [0,0] } as Score
    )
    const [ isInvertSideSwap, setIsInvertSideSwap ] = useState(false)
    const [ isInvertServingTeam, setIsInvertServingTeam ] = useState(false)
    const [ isInvertServingPlayer, setIsInvertServingPlayer ] = useState(false)

    const { setGame: setSharedGame } = useGameContext();
    useEffect(() => {
        setSharedGame(game);
    }, [game, score]);

    if(!game.points.length) {
        //logToUI("FIRST INIT PLAYER POS ---------------------------------");
        renderServingPosition(teams[0], false, game,score.setsTeam[0]+score.setsTeam[1], fieldGraphicConstants);
    }

    const onLineEvent = (buttonIdx : number) => {
        // 'OUT', 'OUT touched', 'IN','FAIL' 'Net fault', 'Net fault','FAIL','IN', 'OUT touched', 'OUT'
        switch (buttonIdx) {
            case 0: // left 'OUT'
                addLineEvent(game, currentTouchIdx, true, 'OUT', fieldGraphicConstants, teamScores);
                break;
            case 1: // left 'OUT touched'
                addLineEvent(game, currentTouchIdx, true, 'OUT touched', fieldGraphicConstants, teamScores);
                break;
            case 2: // left 'IN'
                addLineEvent(game, currentTouchIdx, true, 'IN', fieldGraphicConstants, teamScores);
                break;
            case 3: // left 'Net fault'
                addLineEvent(game, currentTouchIdx, true, 'Net fault', fieldGraphicConstants, teamScores);
                break;
            case 4: // left 'Net fault'
                addLineEvent(game, currentTouchIdx, false, 'Net fault', fieldGraphicConstants, teamScores);
                break;
            case 5: // left 'IN'
                addLineEvent(game, currentTouchIdx, false, 'IN', fieldGraphicConstants, teamScores);
                break;
            case 6: // left 'OUT touched'
                addLineEvent(game, currentTouchIdx, false, 'OUT touched', fieldGraphicConstants, teamScores);
                break;
            case 7: // left 'OUT'
                addLineEvent(game, currentTouchIdx, false, 'OUT', fieldGraphicConstants, teamScores);
                break;
        }
    }

    const gotoMove = (buttonIdx : number) => {
        //logToUI("gotoMove "+buttonIdx)
        let newTouchIdx: TouchIndex | null = currentTouchIdx;
        switch (buttonIdx) {
            case 0:
                //logToUI("gotoMove previous Point "+JSON.stringify(currentTouchIdx));
                newTouchIdx = getPreviousPointIndex(game, currentTouchIdx);
                if(newTouchIdx) {
                    logToUI("previous Point "+JSON.stringify(newTouchIdx));
                    setCurrentTouchIdx(newTouchIdx);
                } else {
                    logToUI("already first point");
                }
                break;
            case 1:
                //("gotoMove previous touch");
                newTouchIdx = getPreviousTouchIndex(game, currentTouchIdx);
                if(newTouchIdx) {
                    setCurrentTouchIdx(newTouchIdx);
                } else {
                    logToUI("already first touch");
                }
                break;
            case 2:
                //logToUI("gotoMove Next touch");
                newTouchIdx = getNextTouchIndex(game, currentTouchIdx);
                if(newTouchIdx) {
                    setCurrentTouchIdx(newTouchIdx);
                } else {
                    logToUI("already last touch");
                }
                break;
            case 3:
                //logToUI("gotoMove Next Point");
                newTouchIdx = getNextPointIndex(game, currentTouchIdx);
                if(newTouchIdx) {
                    setCurrentTouchIdx(newTouchIdx);
                } else {
                    logToUI("already last point");
                }
                break;

        }
        if(newTouchIdx && !isLastTouchIndex(game, newTouchIdx)) {
            setIsEditMode(false)
        }
        if(newTouchIdx && newTouchIdx !== currentTouchIdx) {
            const newScore = calculateScore(game, newTouchIdx);
            setScore(newScore);
            const point = game.points[newTouchIdx.pointIdx];
            if (point) {
                setIsInvertSideSwap(!!point.isInvertSideSwap);
                setIsInvertServingTeam(!!point.isInvertServingTeam);
                setIsInvertServingPlayer(!!point.isInvertServingPlayer);
            }
        }
    }
    const teamScores = (team : number) => {
        const scoringTeam = game.teams[0].startingSide === 0 ? game.teams[team] : game.teams[1-team];
        if(game.points.length) {
            game.points[game.points.length-1].wonBy = scoringTeam
        }
        // update stats on all touches of the point
        let touchIdxIterator: TouchIndex | null = {
            pointIdx: game.points.length - 1,   // Game.points index
            teamTouchesIdx: 0,                  // Game.points.teamTouches index
            touchIdx: 0                         // Game.points.teamTouches.touch index
        } as TouchIndex
        let prevIdx = null;
        let scoringTouchIdx = null;
        let failingTouchIdx = null;
        //console.log("score->update ALL stats FROM ",touchIdxIterator.pointIdx, game.points.length - 1)
        while(touchIdxIterator && touchIdxIterator.pointIdx === (game.points.length - 1)) {
            //console.log("score->update stats for ",touchIdxIterator);
            updateTouchStats(game,touchIdxIterator,prevIdx,null, fieldGraphicConstants );
            const itTouch = getTouch(game,touchIdxIterator);
            // success for the last touch of the scoring team, if exists
            if(itTouch && (itTouch.player.id === scoringTeam.players[0].id || itTouch.player.id === scoringTeam.players[1].id)
                /*&& touchIdxIterator.teamTouchesIdx < currentTouchIdx.teamTouchesIdx*/) {
                scoringTouchIdx = touchIdxIterator;
                failingTouchIdx = null;
            }

            // fail for the last touch of the other team, if exists and after the success
            if(itTouch && itTouch.player.id !== scoringTeam.players[0].id && itTouch.player.id !== scoringTeam.players[1].id && !failingTouchIdx) {
                failingTouchIdx = touchIdxIterator;
            }

            prevIdx = touchIdxIterator;
            touchIdxIterator = getNextTouchIndex(game,touchIdxIterator);
        }
        if(scoringTouchIdx){
            const scoringTouch = getTouch(game,scoringTouchIdx);
            if(scoringTouch) {
                scoringTouch.isScoring = true;
            }
        }
        if(failingTouchIdx){
            const failingTouch = getTouch(game,failingTouchIdx);
            if(failingTouch) {
                failingTouch.isFail = true;
            }
        }

        // log what happened
        /*let recap = scoringTeam.id+ " scores";
        if(currentTouchIdx.teamTouchesIdx>0) {
            const attackType =  currentTouchIdx.teamTouchesIdx === 1 && currentTouchIdx.touchIdx <2 ? " service" : "an attack";
            //if(currentTouchIdx.touchIdx < 2 && scoringTeam.id !== game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].team.id) {
            recap += " on "+attackType+" by "+game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx-1].touch[game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx-1].touch.length-1].player.id;

        } else {
            // service only
            if (scoringTeam.id === game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].team.id) {
                recap += " on an ace by "+game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].touch[currentTouchIdx.touchIdx].player.id;
            } else {
                recap += " on a failed service by "+game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].touch[currentTouchIdx.touchIdx].player.id;
            }
        }
        logToUI(recap)*/
        const successAndFails = getSuccessAndFail(game, currentTouchIdx);
        successAndFails.forEach(oneTouchIdx => {
            const oneTouch = getTouch(game, oneTouchIdx)
            if(oneTouch && oneTouch.isFail) {
                logToUI("Fail was a bad "+oneTouch.stateName+" by "+oneTouch.player.id)
            }
            if(oneTouch && oneTouch.isScoring) {
                logToUI("Success was a "+oneTouch.stateName+" by "+oneTouch.player.id)
            }
        })
        if(!successAndFails.length) {
            logToUI("no success or fails in this point")
        }

        // prepare new point
        const newTouchIdx = {
            pointIdx: currentTouchIdx.pointIdx+1,
            teamTouchesIdx: 0,
            touchIdx: 0
        } as TouchIndex;
        const newScore = calculateScore(game, newTouchIdx);
        //logToUI("score... team, lastserv team, score[team]", team, lastServingTeam, scoreTeam[team])
        //logToUI("team "+team+" scores... ", ''+scoreTeam[0], ''+scoreTeam[1])

        // If the receiving team scored (side-out), reset "swap serving team"
        const servingTeamThisPoint = game.points[game.points.length - 1]?.teamTouches[0]?.team;
        if (servingTeamThisPoint && scoringTeam.id !== servingTeamThisPoint.id) {
            setIsInvertServingTeam(false);
        }

        game.points.push({
            set: newScore.setsTeam[0]+newScore.setsTeam[1],
            teamTouches: [],
            isInvertSideSwap: isInvertSideSwap,
            isInvertServingTeam: servingTeamThisPoint && scoringTeam.id !== servingTeamThisPoint.id ? false : isInvertServingTeam,
            isInvertServingPlayer: isInvertServingPlayer
        } as Point);
        setScore(newScore);
        console.log("Score = transition to ", newTouchIdx)
        setCurrentTouchIdx(newTouchIdx);
        const newServingTeam = scoringTeam; // scoring team always serves next
        renderServingPosition(
            newServingTeam,
            isSideSwapped(game, newTouchIdx),
            game,
            newScore.setsTeam[0]+newScore.setsTeam[1],
            fieldGraphicConstants,
            isInvertServingPlayer);

        setLastServingTeam(team);
        console.log("save",JSON.stringify(game))
    }

    const gameJsonReplacer = (_key: string, value: any) => {
        // Replace Reanimated SharedValue objects with just their .value
        if (value && typeof value === 'object' && value._isReanimatedSharedValue) {
            return value.value;
        }
        // Strip animation sequence arrays
        if (_key === 'plannedMoveXSeq' || _key === 'plannedMoveYSeq'
            || _key === 'plannedBallMoveXSeq' || _key === 'plannedBallMoveYSeq') {
            return undefined;
        }
        return value;
    };

    const exportGame = async () => {
        const gameJson = JSON.stringify(game, gameJsonReplacer);
        const fileName = `${(game.gameTitle || 'game').replace(/[^a-zA-Z0-9]/g, '_')}.json`;

        if (Platform.OS === 'web') {
            const blob = new Blob([gameJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            logToUI('Game exported: ' + fileName);
        } else {
            const fileUri = FileSystem.documentDirectory + fileName;
            await FileSystem.writeAsStringAsync(fileUri, gameJson);
            await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
            logToUI('Game exported: ' + fileName);
        }
    };

    const importGame = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                logToUI('Import cancelled');
                return;
            }

            const file = result.assets[0];
            let jsonString: string;

            if (Platform.OS === 'web') {
                // On web, file.uri is a blob URL; fetch and read it
                const response = await fetch(file.uri);
                jsonString = await response.text();
            } else {
                jsonString = await FileSystem.readAsStringAsync(file.uri);
            }

            const loadedGame = JSON.parse(jsonString) as SerializedGame;
            // Update player IDs and team metadata from imported data,
            // but keep the existing SharedValues for playerX/playerY
            const importedTeams = loadedGame.teams;
            if (importedTeams && importedTeams.length >= 2) {
                teams[0].id = importedTeams[0].id;
                teams[0].startingSide = importedTeams[0].startingSide;
                teams[0].prefersBlockId = importedTeams[0].prefersBlockId;
                teams[0].players[0].id = importedTeams[0].players[0].id;
                teams[0].players[1].id = importedTeams[0].players[1].id;
                teams[1].id = importedTeams[1].id;
                teams[1].startingSide = importedTeams[1].startingSide;
                teams[1].prefersBlockId = importedTeams[1].prefersBlockId;
                teams[1].players[0].id = importedTeams[1].players[0].id;
                teams[1].players[1].id = importedTeams[1].players[1].id;
            }
            const newGame = initGame(ballX, ballY, teams, loadedGame);
            setGame(newGame);

            const newTouchIdx = {
                pointIdx: newGame.points.length ? newGame.points.length - 1 : 0,
                teamTouchesIdx: 0,
                touchIdx: 0,
            } as TouchIndex;
            setCurrentTouchIdx(newTouchIdx);

            const newScore = newGame.points.length
                ? calculateScore(newGame, newTouchIdx)
                : { scoreTeam: [0, 0], setsTeam: [0, 0] } as Score;
            setScore(newScore);

            setIsEditMode(!newGame.points.length || isLastTouchIndex(newGame, newTouchIdx));
            const lastPoint = newGame.points.length > 0 ? newGame.points[newTouchIdx.pointIdx] : null;
            setIsInvertSideSwap(lastPoint ? !!lastPoint.isInvertSideSwap : false);
            setIsInvertServingTeam(lastPoint ? !!lastPoint.isInvertServingTeam : false);
            setIsInvertServingPlayer(lastPoint ? !!lastPoint.isInvertServingPlayer : false);
            logToUI('Game imported: ' + (loadedGame.gameTitle || file.name));
        } catch (e: any) {
            logToUI('Import error: ' + (e.message || e));
        }
    };

    const newGame = () => {
        game.points = [];
        // Set default game title with current month/year
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        game.gameTitle = `tournament ${month} ${year} game 1`;
        // Reset team/player IDs to defaults on both local teams and game.teams
        game.teams[0].id = 'Team1';
        game.teams[0].players[0].id = 'Jeff';
        game.teams[0].players[1].id = 'Domna';
        game.teams[0].prefersBlockId = 'Domna';
        game.teams[1].id = 'Team2';
        game.teams[1].players[0].id = 'male';
        game.teams[1].players[1].id = 'AnaPatricia';
        game.teams[1].prefersBlockId = null;
        teams[0].id = game.teams[0].id;
        teams[0].players[0].id = game.teams[0].players[0].id;
        teams[0].players[1].id = game.teams[0].players[1].id;
        teams[0].prefersBlockId = game.teams[0].prefersBlockId;
        teams[1].id = game.teams[1].id;
        teams[1].players[0].id = game.teams[1].players[0].id;
        teams[1].players[1].id = game.teams[1].players[1].id;
        teams[1].prefersBlockId = game.teams[1].prefersBlockId;
        const newTouchIdx = {
            pointIdx: 0,
            teamTouchesIdx: 0,
            touchIdx: 0,
        } as TouchIndex;
        setCurrentTouchIdx(newTouchIdx);
        setScore({ scoreTeam: [0, 0], setsTeam: [0, 0] } as Score);
        setIsEditMode(true);
        setIsInvertSideSwap(false);
        setIsInvertServingTeam(false);
        setIsInvertServingPlayer(false);
        setLastServingTeam(0);
        renderServingPosition(game.teams[0], false, game, 0, fieldGraphicConstants);
        setGame({...game});
        logToUI('New game started');
    };

    const deleteCurrentTouch = () => {
        if (!game.points.length) {
            logToUI('Nothing to delete');
            return;
        }

        const lastPointIdx = game.points.length - 1;
        const lastPoint = game.points[lastPointIdx];

        // If the point was already scored (a new empty point was pushed after it),
        // remove that next empty point and clear the score result + stats
        if (lastPoint.teamTouches.length === 0) {
            // The last point is the empty "next" point — the scored point is the one before
            game.points.pop(); // remove the empty next point
            if (!game.points.length) {
                logToUI('Nothing to delete');
                return;
            }
            const scoredPoint = game.points[game.points.length - 1];
            scoredPoint.wonBy = undefined;
            // Clear isScoring/isFail on all touches of the point
            for (const tt of scoredPoint.teamTouches) {
                for (const t of tt.touch) {
                    t.isScoring = undefined;
                    t.isFail = undefined;
                }
            }
        }

        const pointIdx = game.points.length - 1;
        const point = game.points[pointIdx];

        if (!point.teamTouches.length) {
            logToUI('Nothing to delete');
            return;
        }

        const lastTT = point.teamTouches[point.teamTouches.length - 1];

        if (lastTT.touch.length > 0) {
            lastTT.touch.pop();
        }

        // If the teamTouches entry is now empty, remove it
        if (lastTT.touch.length === 0) {
            point.teamTouches.pop();
        }

        // Determine the new current touch index
        if (point.teamTouches.length === 0) {
            // The service touch itself was deleted
            if (pointIdx === 0) {
                // Very first point — re-init serving position
                const newTouchIdx = { pointIdx: 0, teamTouchesIdx: 0, touchIdx: 0 } as TouchIndex;
                setCurrentTouchIdx(newTouchIdx);
                const newScore = { scoreTeam: [0, 0], setsTeam: [0, 0] } as Score;
                setScore(newScore);
                point.teamTouches = [];
                renderServingPosition(teams[0], false, game, 0, fieldGraphicConstants, isInvertServingPlayer);
                setIsEditMode(true);
                logToUI('Deleted service touch, back to start');
                return;
            } else {
                // Remove the now-empty point and go back to the previous point's last touch
                game.points.pop();
                const prevPointIdx = game.points.length - 1;
                const prevPoint = game.points[prevPointIdx];
                // Clear wonBy on the previous point so it can be re-scored
                prevPoint.wonBy = undefined;
                // Clear isScoring/isFail on all touches
                for (const tt of prevPoint.teamTouches) {
                    for (const t of tt.touch) {
                        t.isScoring = undefined;
                        t.isFail = undefined;
                    }
                }
                const prevLastTT = prevPoint.teamTouches[prevPoint.teamTouches.length - 1];
                const newTouchIdx = {
                    pointIdx: prevPointIdx,
                    teamTouchesIdx: prevPoint.teamTouches.length - 1,
                    touchIdx: prevLastTT.touch.length - 1
                } as TouchIndex;
                setCurrentTouchIdx(newTouchIdx);
                const newScore = calculateScore(game, newTouchIdx);
                setScore(newScore);
                setIsEditMode(true);
                renderTouchIndex(game, newTouchIdx);
                logToUI('Deleted touch, back to previous point');
                return;
            }
        }

        // Normal case: still have touches in this point
        const newLastTT = point.teamTouches[point.teamTouches.length - 1];
        const newTouchIdx = {
            pointIdx: pointIdx,
            teamTouchesIdx: point.teamTouches.length - 1,
            touchIdx: newLastTT.touch.length - 1
        } as TouchIndex;
        setCurrentTouchIdx(newTouchIdx);
        const newScore = calculateScore(game, newTouchIdx);
        setScore(newScore);
        setIsEditMode(true);
        renderTouchIndex(game, newTouchIdx);
        logToUI('Deleted last touch');
    };

    const onSwapSidesToggle = () => {
        const newValue = !isInvertSideSwap;
        setIsInvertSideSwap(newValue);

        // Update the current point's isInvertSideSwap
        if (game.points.length > 0) {
            game.points[game.points.length - 1].isInvertSideSwap = newValue;
        }

        // Re-render serving position with the new side swap
        const currentPoint = game.points[game.points.length - 1];
        const currentTeamTouches = currentPoint?.teamTouches[0];
        if (currentTeamTouches) {
            const servingTeam = currentTeamTouches.team;
            renderServingPosition(
                servingTeam,
                isSideSwapped(game, currentTouchIdx),
                game,
                score.setsTeam[0] + score.setsTeam[1],
                fieldGraphicConstants,
                isInvertServingPlayer
            );
        }
    };

    const onSwapServingTeamToggle = () => {
        const newValue = !isInvertServingTeam;
        setIsInvertServingTeam(newValue);

        if (game.points.length > 0) {
            game.points[game.points.length - 1].isInvertServingTeam = newValue;
        }

        const currentPoint = game.points[game.points.length - 1];
        const currentServTeam = currentPoint?.teamTouches[0]?.team;
        if (currentServTeam) {
            const newServTeam = getOtherTeam(game.teams, currentServTeam);
            currentPoint.teamTouches = [];
            renderServingPosition(
                newServTeam,
                isSideSwapped(game, currentTouchIdx),
                game,
                score.setsTeam[0] + score.setsTeam[1],
                fieldGraphicConstants,
                isInvertServingPlayer
            );
        }
    };

    const onSwapServingPlayerToggle = () => {
        const newValue = !isInvertServingPlayer;
        setIsInvertServingPlayer(newValue);

        if (game.points.length > 0) {
            game.points[game.points.length - 1].isInvertServingPlayer = newValue;
        }

        const currentPoint = game.points[game.points.length - 1];
        const servingTeam = currentPoint?.teamTouches[0]?.team;
        if (servingTeam) {
            currentPoint.teamTouches = [];
            renderServingPosition(
                servingTeam,
                isSideSwapped(game, currentTouchIdx),
                game,
                score.setsTeam[0] + score.setsTeam[1],
                fieldGraphicConstants,
                newValue
            );
        }
    };

    const onSwapReceiver = () => {
        const currentPoint = game.points[game.points.length - 1];
        if (!currentPoint) return;
        const currentTT = currentPoint.teamTouches[currentTouchIdx.teamTouchesIdx];
        if (!currentTT || !currentTT.touch.length) return;
        const currentTouch = currentTT.touch[0];
        const receivingTeam = currentTT.team;
        const otherPlayer = getOtherPlayer(receivingTeam, currentTouch.player.id);

        // Get the previous touchIdx (the last touch before the ball crossed the net)
        const prevTouchIdx = getPreviousTouchIndex(game, currentTouchIdx);

        renderReceivingPosition(
            currentTouch.ballX || game.ballX.value,
            currentTouch.ballY || game.ballY.value,
            game,
            prevTouchIdx || currentTouchIdx,
            currentPoint.set,
            fieldGraphicConstants,
            otherPlayer.id
        );
        logToUI('Swapped receiver to ' + otherPlayer.id);
    };

    const onFieldTouch = (event : GestureStateChangeEvent<TapGestureHandlerEventPayload>) => {
        const currentPoint = game.points[game.points.length-1];
        const currentTeamTouches = currentPoint.teamTouches[currentPoint.teamTouches.length-1];
        const currentTouch = currentTeamTouches.touch[currentTeamTouches.touch.length-1];
        const sideOutState = currentTouch.stateName;
        //logToUI("touch "+sideOutState+" "+JSON.stringify(currentTouchIdx))
        if(isEditMode) {

            switch (sideOutState) {
                case 'service':
                    // Check if the ball is opposite the service area
                    if (event.x > width/2 !== game.ballX.value > width/2) {
                        logToUI("service -> pass")
                        //sideOutContinues = true;
                        //sideOutState.value = 'pass';
                        currentPoint.teamTouches.push({
                            team: getOtherTeam(game.teams, currentTeamTouches.team),
                            touch: []
                        });
                        const newTouchIdx = {
                            pointIdx: currentTouchIdx.pointIdx,
                            teamTouchesIdx: currentTouchIdx.teamTouchesIdx+1,
                            touchIdx: 0
                        } as TouchIndex
                        console.log("transition to ", newTouchIdx)
                        setCurrentTouchIdx(newTouchIdx);
                        renderReceivingPosition(
                            event.x,event.y,
                            game,
                            currentTouchIdx,
                            currentPoint.set,
                            fieldGraphicConstants
                        );
                        //anaPatriciaX.value = withTiming(validatePlayerX(event.x+ballsize/2),{ duration : 500});
                        //anaPatriciaY.value = withTiming(validatePlayerY(event.y),{ duration : 500});

                    } else {
                        logToUI("service does not cross? click on the score or serve again");
                    }
                    break;
                case 'pass':
                    // Check if the ball stays in the pass area
                    if (event.x > width/2 === (currentTouch.ballX || game.ballX.value) > width/2) {
                        logToUI("pass -> set")
                        //sideOutContinues = true;
                        //sideOutState.value = 'pass';

                        setCurrentTouchIdx({
                            pointIdx: currentTouchIdx.pointIdx,
                            teamTouchesIdx: currentTouchIdx.teamTouchesIdx,
                            touchIdx: currentTouchIdx.touchIdx+1
                        } as TouchIndex);
                        renderSettingPosition(
                            event.x,event.y,
                            game,
                            currentPoint.set,
                            fieldGraphicConstants
                        );
                    } else {
                        logToUI("pass -> pass (cross the net)")
                        //sideOutContinues = true;
                        //sideOutState.value = 'pass';
                        currentPoint.teamTouches.push({
                            team: getOtherTeam(game.teams, currentTeamTouches.team),
                            touch: []
                        });
                        setCurrentTouchIdx({
                            pointIdx: currentTouchIdx.pointIdx,
                            teamTouchesIdx: currentTouchIdx.teamTouchesIdx+1,
                            touchIdx: 0
                        } as TouchIndex);
                        renderReceivingPosition(
                            event.x,event.y,
                            game,
                            currentTouchIdx,
                            currentPoint.set,
                            fieldGraphicConstants
                        );
                    }
                    break;
                case 'set':
                    // Check if the ball stays in the pass area
                    if (event.x > width/2 === (currentTouch.ballX || game.ballX.value) > width/2) {
                        logToUI("set -> attack")
                        //sideOutContinues = true;
                        //sideOutState.value = 'pass';
                        setCurrentTouchIdx({
                            pointIdx: currentTouchIdx.pointIdx,
                            teamTouchesIdx: currentTouchIdx.teamTouchesIdx,
                            touchIdx: currentTouchIdx.touchIdx+1
                        } as TouchIndex);
                        renderAttackPosition(
                            event.x,event.y,
                            game,
                            currentPoint.set,
                            fieldGraphicConstants
                        );
                    } else {
                        logToUI("set -> pass (crosses the net)")
                        //sideOutContinues = true;
                        //sideOutState.value = 'pass';
                        currentPoint.teamTouches.push({
                            team: getOtherTeam(game.teams, currentTeamTouches.team),
                            touch: []
                        });
                        setCurrentTouchIdx({
                            pointIdx: currentTouchIdx.pointIdx,
                            teamTouchesIdx: currentTouchIdx.teamTouchesIdx+1,
                            touchIdx: 0
                        } as TouchIndex);
                        renderReceivingPosition(
                            event.x,event.y,
                            game,
                            currentTouchIdx,
                            currentPoint.set,
                            fieldGraphicConstants
                        );
                    }
                    break;
                case 'attack':
                    // Check if the ball is opposite the service area
                    if (event.x > width/2 !== (currentTouch.ballX || game.ballX.value) > width/2) {
                        logToUI("attack -> pass (crosses the net)")
                        //sideOutContinues = true;
                        //sideOutState.value = 'pass';
                        currentPoint.teamTouches.push({
                            team: getOtherTeam(game.teams, currentTeamTouches.team),
                            touch: []
                        });
                        setCurrentTouchIdx({
                            pointIdx: currentTouchIdx.pointIdx,
                            teamTouchesIdx: currentTouchIdx.teamTouchesIdx+1,
                            touchIdx: 0
                        } as TouchIndex);
                        renderReceivingPosition(
                            event.x,event.y,
                            game,
                            currentTouchIdx,
                            currentPoint.set,
                            fieldGraphicConstants
                        );
                        //anaPatriciaX.value = withTiming(validatePlayerX(event.x+ballsize/2),{ duration : 500});
                        //anaPatriciaY.value = withTiming(validatePlayerY(event.y),{ duration : 500});

                    } else {
                        logToUI("attack failed, 4 touches");

                        teamScores(game.teams[0].id === currentTeamTouches.team.id ? 1 : 0);
                    }
            }
            //setCurrentTouchIdx(JSON.parse(JSON.stringify(currentTouchIdx)))
        } else {
            logToUI("not in edit mode, touch ignored");
        }
    }
    const gestureTap = Gesture.Tap().onStart(onFieldTouch);

    // DnD state
    // keep the DnD on hte same side of the field
    const MINIMUM_DISTANCE = 50;
    const isLeft = useSharedValue(true);
    const isDnDPlayerId = useSharedValue("-2"); // Player id or "-1" for ball, "-2" if nothing

    //const position = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            console.log("onUpdate > "+isDnDPlayerId.value);
            if(isDnDPlayerId.value === "-2") {
                // discovery mode
                // find closest draggable
                const ballDist = getDistance(ballX.value,ballY.value, validateBallX(e.x) , validateBallY(e.y) );
                const closestPlayer = getClosestPlayer(game.teams.flatMap(oneTeam => oneTeam.players).map(onePlayer => onePlayer.id), validatePlayerX(e.x) , validatePlayerY(e.y),game,currentTouchIdx );
                const closestPlayerDist = getDistance(closestPlayer.playerX.value, closestPlayer.playerY.value, validatePlayerX(e.x) , validatePlayerY(e.y) );
                if(MINIMUM_DISTANCE > ballDist && closestPlayerDist > ballDist) {
                    console.log("DnD start for ball ",closestPlayerDist ,">", ballDist)
                    isLeft.value = ballX.value < width/2;
                    isDnDPlayerId.value = "-1"; // ball
                } else if(MINIMUM_DISTANCE > closestPlayerDist && ballDist > closestPlayerDist) {
                    console.log("DnD start for "+closestPlayer.id,closestPlayerDist ,">", ballDist)
                    isLeft.value = closestPlayer.playerX.value < width/2;
                    isDnDPlayerId.value = closestPlayer.id; // player
                } else {
                    console.log("nothing to DnD ",MINIMUM_DISTANCE, ballDist, closestPlayerDist);
                    isDnDPlayerId.value = "-2"; // nothing
                }
            } else if (isLeft.value === (e.x < width/2)) {
                if(isDnDPlayerId.value === "-1") {
                    // ball DnD
                    ballX.value = validateBallX(e.x);
                    ballY.value = validateBallY(e.y);
                } else {
                    // player Dnd
                    const player = game.teams.flatMap(oneTeam => oneTeam.players).find(player => player.id === isDnDPlayerId.value);
                    if(player) {
                        player.playerX.value = validatePlayerX(e.x);
                        player.playerY.value = validatePlayerY(e.y);
                    }
                }
            }
        })
        .onEnd((e) => {
            const currentTouch = getTouch(game,currentTouchIdx);
            let isCurrentTouchUpdated = false;
            if(currentTouch && isDnDPlayerId.value === "-1") {
                currentTouch.ballX = validateBallX(e.x);
                currentTouch.ballY = validateBallY(e.y);
                isCurrentTouchUpdated = true;
            } else if (currentTouch && isDnDPlayerId.value !== "-2") {
                // player DnD
                const player = game.teams.flatMap(oneTeam => oneTeam.players).find(player => player.id === isDnDPlayerId.value);
                if(player) {
                    currentTouch.playerExplicitMoves = currentTouch.playerExplicitMoves.filter(oneCalculatedPlayer => oneCalculatedPlayer.id !== player.id);
                    currentTouch.playerExplicitMoves.push({
                        id: player.id,
                        x: validatePlayerX(e.x),
                        y: validatePlayerY(e.y)
                    } as CalculatedPlayer);
                    isCurrentTouchUpdated = true;
                }
            }
            if(isCurrentTouchUpdated) {
                updateTouchStats(game,currentTouchIdx,getPreviousTouchIndex(game, currentTouchIdx),getNextTouchIndex(game, currentTouchIdx), fieldGraphicConstants )
            }

            isDnDPlayerId.value = "-2"; // nothing
        });

    const composedGesture = Gesture.Race(gestureTap, panGesture);

    const playerImageMap: Record<string, ReturnType<typeof useImage>> = {
        'Taru': taru,
        'Niina': niina,
        'Jeff': jeff,
        'Domna': domna,
        'AnaPatricia': anaPatricia,
        'Duda': duda,
        'male': male,
    };

    // Resolve sprite images for each player slot based on current player IDs
    const p1Image = playerImageMap[game.teams[0]?.players[0]?.id] || niina;
    const p2Image = playerImageMap[game.teams[0]?.players[1]?.id] || taru;
    const p3Image = playerImageMap[game.teams[1]?.players[0]?.id] || anaPatricia;
    const p4Image = playerImageMap[game.teams[1]?.players[1]?.id] || duda;

    if (!ball || !field || !p1Image || !p2Image || !p3Image || !p4Image || !finlandFlag || !brazilFlag) {
        return <Text>Image is loading...</Text>;
    }
    if(!isEditMode) {
        //console.log("replay RENDER-----");

        if(isLastTouchIndex(game, currentTouchIdx)) {
            setIsEditMode(true)
        }
        renderTouchIndex(game,currentTouchIdx);
    }
    //console.log("RENDER------------------------------------------------",currentTouchIdx)
    return (
        <View style={styles.container}>
            <TextInput
                style={styles.gameTitleInput}
                value={game.gameTitle}
                onChangeText={(text) => {
                    game.gameTitle = text;
                    setGame({...game});
                }}
                placeholder="Game title"
            />
            <div style={styles.flaggedScore}>
                <Canvas style={{ height:30, width:50 }} >
                    <Image
                        image={finlandFlag}
                        width={50}
                        height={30}
                        fit={'cover'}

                    />
                </Canvas>


                <ButtonGroup
                    buttons={['  '+score.scoreTeam[0]+ '  ', '  '+score.scoreTeam[1]+ '  ']}
                    selectedIndex={lastServingTeam}
                    onPress={teamScores}
                    containerStyle={{ marginBottom: 0, marginTop: 0, paddingVertical: 0 }}
                    textStyle={styles.textButton}
                />
                <Canvas style={{ height:30, width:50 }} >
                    <Image
                        image={brazilFlag}
                        width={50}
                        height={30}
                        fit={'cover'}

                    />
                </Canvas>
            </div>
            <ButtonGroup
                buttons={['  '+score.setsTeam[0]+ '  ', '  '+score.setsTeam[1]+ '  ']}
                selectedIndex={2}
                containerStyle={{ marginBottom: 0, marginTop: 0, paddingVertical: 0 }}
                textStyle={styles.smallTextButton}
            />
            {isEditMode && currentTouchIdx.teamTouchesIdx === 0 && currentTouchIdx.touchIdx === 0 && (
                <View style={styles.swapCheckboxes}>
                    <CheckBox
                        title="Swap sides"
                        checked={isInvertSideSwap}
                        onPress={onSwapSidesToggle}
                        containerStyle={{ marginBottom: 0, marginTop: 0, paddingVertical: 2, backgroundColor: 'transparent' }}
                        textStyle={styles.smallTextButton}
                    />
                    <CheckBox
                        title="Swap serving team"
                        checked={isInvertServingTeam}
                        onPress={onSwapServingTeamToggle}
                        containerStyle={{ marginBottom: 0, marginTop: 0, paddingVertical: 2, backgroundColor: 'transparent' }}
                        textStyle={styles.smallTextButton}
                    />
                    <CheckBox
                        title="Swap serving player"
                        checked={isInvertServingPlayer}
                        onPress={onSwapServingPlayerToggle}
                        containerStyle={{ marginBottom: 0, marginTop: 0, paddingVertical: 2, backgroundColor: 'transparent' }}
                        textStyle={styles.smallTextButton}
                    />
                </View>
            )}
            {isEditMode && currentTouchIdx.teamTouchesIdx > 0 && currentTouchIdx.touchIdx === 0 && (
                <TouchableOpacity style={styles.swapReceiverButton} onPress={onSwapReceiver}>
                    <Text style={styles.ioButtonText}>🔄 Swap Receiver</Text>
                </TouchableOpacity>
            )}
            <ButtonGroup
                buttons={['OUT', 'Touched', 'IN', 'Net fault', 'Net fault','IN', 'Touched', 'OUT']}
                selectedIndex={100}
                onPress={onLineEvent}
                containerStyle={{ marginBottom: 5, marginTop: 0 }}
                textStyle={styles.smallTextButton}
                buttonStyle={styles.buttonStyle}
            />
            <GestureDetector gesture={composedGesture}>
                <Canvas style={{ width, height }} >
                   <Image
                        image={field}
                        width={width}
                        height={height}
                        fit={'cover'}

                   />
                   <Image
                        image={ball}
                        width={ballsize}
                        height={ballsize}
                        fit={'cover'}
                        x={ballX}
                        y={ballY}
                   />
                   <Image
                        image={p2Image}
                        width={playerSize}
                        height={playerSize}
                        fit={'cover'}
                        x={taruX}
                        y={taruY}
                   />
                   <Image
                        image={p1Image}
                        width={playerSize}
                        height={playerSize}
                        fit={'cover'}
                        x={niinaX}
                        y={niinaY}
                   />
                   <Image
                        image={p3Image}
                        width={playerSize}
                        height={playerSize}
                        fit={'cover'}
                        x={anaPatriciaX}
                        y={anaPatriciaY}
                   />
                   <Image
                        image={p4Image}
                        width={playerSize}
                        height={playerSize}
                        fit={'cover'}
                        x={dudaX}
                        y={dudaY}
                   />
                </Canvas>
            </GestureDetector>
            <Text>{debugText[debugText.length-5]}</Text>
            <Text>{debugText[debugText.length-4]}</Text>
            <Text>{debugText[debugText.length-3]}</Text>
            <Text>{debugText[debugText.length-2]}</Text>
            <Text>{debugText[debugText.length-1]}</Text>
            {/*<Text>{JSON.stringify(currentTouchIdx)}</Text>*/}

            <ButtonGroup
                buttons={[ '\u{300a}', '\u{2329}', '\u{232a}', '\u{300b}']}
                selectedIndex={10}
                containerStyle={{ marginBottom: 1 }}
                textStyle={styles.textButton}
                onPress={gotoMove}
            />
            <View style={styles.ioButtons}>
                {isEditMode && isLastTouchIndex(game, currentTouchIdx) && (
                    <TouchableOpacity style={styles.deleteButton} onPress={deleteCurrentTouch}>
                        <Text style={styles.ioButtonText}>🗑️ Delete Last Touch</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.ioButton} onPress={newGame}>
                    <Text style={styles.ioButtonText}>🆕 New Game</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ioButton} onPress={importGame}>
                    <Text style={styles.ioButtonText}>📂 Import</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ioButton} onPress={exportGame}>
                    <Text style={styles.ioButtonText}>💾 Export</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    skia: {
        width: 300,
        height: 300
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gameTitleInput: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: 2,
        paddingHorizontal: 8,
        marginBottom: 0,
        minWidth: 250,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    flaggedScore: {
        display: 'flex',
        flexDirection: 'row',
        marginHorizontal: 'auto',
        marginVertical: 0,
        alignItems: 'center'
    },
    imageContainer: {
        marginVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: '80%',
    },
    image: {
        flex: 1,
        width: '100%',
        backgroundColor: '#0553',
    },
    textButton: {
        fontSize: 44,
    },
    smallTextButton: {
        fontSize: 16,
    },
    buttonStyle: {
        minWidth: 70,
    },
    swapCheckboxes: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },
    swapReceiverButton: {
        backgroundColor: '#e67e22',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
        marginBottom: 2,
    },
    ioButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 4,
        marginBottom: 8,
    },
    ioButton: {
        backgroundColor: '#2089dc',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    deleteButton: {
        backgroundColor: '#cc3333',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        marginBottom: 4,
    },
    ioButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

