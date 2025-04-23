import { useState, useEffect } from 'react';
import { ButtonGroup, Text, Image as Img } from '@rneui/themed'

import { useWindowDimensions, StyleSheet, View  } from 'react-native';
import {Canvas, Circle, Group, useImage, Image} from "@shopify/react-native-skia";
import {useSharedValue, withTiming} from "react-native-reanimated";
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
    Team,
    Touch,
    Game,
    Score,
    getOtherTeam,
    FieldGraphicConstants,
    TouchIndex,
    isLastTouchIndex,
    renderTouch,
    renderTouchIndex,
    getNextPointIndex,
    getNextTouchIndex, getPreviousTouchIndex, getPreviousPointIndex,
    calculateScore,
    isSideSwapped, addLineEvent
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

export default function TabTwoScreen() {
    const windowWidth = useWindowDimensions().width;
    const windowHeight = useWindowDimensions().height;
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
        //logToUI("lineEvent "+buttonIdx)
        // 'OUT', 'OUT touched', 'IN','FAIL' 'Net fault', 'Net fault','FAIL','IN', 'OUT touched', 'OUT'
        let newTouchIdx = currentTouchIdx;
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
        if(isLastTouchIndex(game, currentTouchIdx)) {
            setIsEditMode(true)
        } else {
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

        // log what happened
        let recap = newServingTeam.id+ " scores";
        if(currentTouchIdx.teamTouchesIdx>0) {
            const attackType =  currentTouchIdx.teamTouchesIdx === 1 && currentTouchIdx.touchIdx <2 ? " service" : "an attack";
            //if(currentTouchIdx.touchIdx < 2 && newServingTeam.id !== game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].team.id) {
            recap += " on "+attackType+" by "+game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx-1].touch[game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx-1].touch.length-1].player.id;
            /*} else {
                logToUI("On a failed attack by "+game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx-1].touch[game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx-1].touch.length-1].player.id);
            }  */
        } else {
            // service only
            if (newServingTeam.id === game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].team.id) {
                recap += " on an ace by "+game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].touch[currentTouchIdx.touchIdx].player.id;
            } else {
                recap += " on a failed service by "+game.points[currentTouchIdx.pointIdx].teamTouches[currentTouchIdx.teamTouchesIdx].touch[currentTouchIdx.touchIdx].player.id;
            }
        }
        logToUI(recap)

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
        let sideOutContinues = false;
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
    const END_POSITION = 200;

    const onLeft = useSharedValue(true);
    //const position = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (onLeft.value) {
                taruX.value = e.translationX;
            } else {
                taruX.value = END_POSITION + e.translationX;
            }
        })
        .onEnd((e) => {
            if (taruX.value > END_POSITION / 2) {
                taruX.value = withTiming(END_POSITION, { duration: 100 });
                onLeft.value = false;
            } else {
                taruX.value = withTiming(0, { duration: 100 });
                onLeft.value = true;
            }
        });

    const composedGesture = Gesture.Race(gestureTap, panGesture);

    if (!ball || !field || !taru || !niina || !anaPatricia || !duda || !finlandFlag || !brazilFlag) {
        return <Text>Image is loading...</Text>;
    }
    if(!isEditMode) {
        console.log("replay RENDER-----");
        renderTouchIndex(game,currentTouchIdx);
    }
    console.log("RENDER------------------------------------------------",currentTouchIdx)
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

