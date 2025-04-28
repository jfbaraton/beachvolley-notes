import { useState } from 'react';
import { ButtonGroup, Text} from '@rneui/themed'

import { StyleSheet, View  } from 'react-native';
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
    Score,
    getOtherTeam,
    FieldGraphicConstants,
    TouchIndex,
    isLastTouchIndex,
    renderTouchIndex,
    getNextPointIndex,
    getNextTouchIndex, getPreviousTouchIndex, getPreviousPointIndex,
    calculateScore,updateTouchStats, getSuccessAndFail,
    isSideSwapped, addLineEvent, getClosestPlayer, getDistance, getTouch, CalculatedPlayer
} from '@/utils/BeachVolleyUtils';

// @ts-ignore
import BallFront from '@/assets/sprites/ball.png';
// @ts-ignore
import FieldFront from '@/assets/sprites/field.jpg';
// @ts-ignore
import TaruFront from '@/assets/sprites/Taru.png';
// @ts-ignore
import NiinaFront from '@/assets/sprites/Niina.jpg';
// @ts-ignore
import AnaPatriciaFront from '@/assets/sprites/AnaPatricia.png';
// @ts-ignore
import DudaFront from '@/assets/sprites/Duda.jpg';
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

    const teams = initTeams(
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
    ));
    //logToUI("BallFront ", JSON.stringify(BallFront))

    const [ isEditMode, setIsEditMode ] = useState(true)
    const [ currentTouchIdx, setCurrentTouchIdx ] = useState({
        pointIdx: 0,       // Game.points index
        teamTouchesIdx: 0, // Game.points.teamTouches index
        touchIdx: 0        // Game.points.teamTouches.touch index
    } as TouchIndex);
    const [ score, setScore ] = useState({
        scoreTeam : [0,0],
        setsTeam : [0,0]
    } as Score)
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
        }
    }
    const teamScores = (team : number) => {
        const newServingTeam = teams[0].startingSide === 0 ? teams[team] : teams[1-team];
        if(game.points.length) {
            game.points[game.points.length-1].wonBy = newServingTeam
        }
        // update stats on all touches of the point
        let touchIdxIterator: TouchIndex | null = {
            pointIdx: game.points.length - 1,   // Game.points index
            teamTouchesIdx: 0,                  // Game.points.teamTouches index
            touchIdx: 0                         // Game.points.teamTouches.touch index
        } as TouchIndex
        let prevIdx = null;
        //console.log("score->update ALL stats FROM ",touchIdxIterator.pointIdx, game.points.length - 1)
        while(touchIdxIterator && touchIdxIterator.pointIdx === (game.points.length - 1)) {
            //console.log("score->update stats for ",touchIdxIterator);
            updateTouchStats(game,touchIdxIterator,prevIdx,null, fieldGraphicConstants );
            prevIdx = touchIdxIterator;
            touchIdxIterator = getNextTouchIndex(game,touchIdxIterator);
        }

        // log what happened
        let recap = newServingTeam.id+ " scores";
        if(currentTouchIdx.teamTouchesIdx>0) {
            const attackType =  currentTouchIdx.teamTouchesIdx === 1 && currentTouchIdx.touchIdx <2 ? " service" : "an attack";
            //if(currentTouchIdx.touchIdx < 2 && newServingTeam.id !== game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].team.id) {
            recap += " on "+attackType+" by "+game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx-1].touch[game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx-1].touch.length-1].player.id;

        } else {
            // service only
            if (newServingTeam.id === game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].team.id) {
                recap += " on an ace by "+game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].touch[currentTouchIdx.touchIdx].player.id;
            } else {
                recap += " on a failed service by "+game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].touch[currentTouchIdx.touchIdx].player.id;
            }
        }
        logToUI(recap)
        const successAndFails = getSuccessAndFail(game, currentTouchIdx);
        successAndFails.forEach(oneTouchIdx => {
            const oneTouch = getTouch(game, touchIdxIterator)
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

        game.points.push({
            set: newScore.setsTeam[0]+newScore.setsTeam[1],
            teamTouches: []
        });
        setScore(newScore);
        console.log("Score = transition to ", newTouchIdx)
        setCurrentTouchIdx(newTouchIdx);

        renderServingPosition(
            newServingTeam,
            isSideSwapped(game, newTouchIdx),
            game,
            newScore.setsTeam[0]+newScore.setsTeam[1],
            fieldGraphicConstants);

        setLastServingTeam(team);
    }
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

    if (!ball || !field || !taru || !niina || !anaPatricia || !duda || !finlandFlag || !brazilFlag) {
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
                    containerStyle={{ marginBottom: 5 }}
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
                containerStyle={{ marginBottom: 5 }}
                textStyle={styles.smallTextButton}
            />
            <ButtonGroup
                buttons={['OUT', 'Touched', 'IN', 'Net fault', 'Net fault','IN', 'Touched', 'OUT']}
                selectedIndex={100}
                onPress={onLineEvent}
                containerStyle={{ marginBottom: 5 }}
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
                        image={taru}
                        width={playerSize}
                        height={playerSize}
                        fit={'cover'}
                        x={taruX}
                        y={taruY}
                   />
                   <Image
                        image={niina}
                        width={playerSize}
                        height={playerSize}
                        fit={'cover'}
                        x={niinaX}
                        y={niinaY}
                   />
                   <Image
                        image={anaPatricia}
                        width={playerSize}
                        height={playerSize}
                        fit={'cover'}
                        x={anaPatriciaX}
                        y={anaPatriciaY}
                   />
                   <Image
                        image={duda}
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
    flaggedScore: {
        display: 'flex',
        flexDirection: 'row',
        margin:'auto',
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
    }
});

