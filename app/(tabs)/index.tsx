import { useState, useEffect } from 'react';
import { ButtonGroup, Text } from '@rneui/themed'

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
    calculateScore
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
        logToUI("FIRST INIT PLAYER POS ---------------------------------");
        renderServingPosition(teams[0], false, game,score.setsTeam[0]+score.setsTeam[1], fieldGraphicConstants);
    }

    const gotoMove = (buttonIdx : number) => {
        //logToUI("gotoMove "+buttonIdx)
        let newTouchIdx = currentTouchIdx;
        switch (buttonIdx) {
            case 0:
                logToUI("gotoMove previous Point "+JSON.stringify(currentTouchIdx));
                newTouchIdx = getPreviousPointIndex(game, currentTouchIdx);
                if(newTouchIdx) {
                    logToUI("previous Point "+JSON.stringify(newTouchIdx));
                    setCurrentTouchIdx(newTouchIdx);
                } else {
                    logToUI("already first point");
                }
                break;
            case 1:
                logToUI("gotoMove previous touch");
                newTouchIdx = getPreviousTouchIndex(game, currentTouchIdx);
                if(newTouchIdx) {
                    setCurrentTouchIdx(newTouchIdx);
                } else {
                    logToUI("already first touch");
                }
                break;
            case 2:
                logToUI("gotoMove Next touch");
                newTouchIdx = getNextTouchIndex(game, currentTouchIdx);
                if(newTouchIdx) {
                    setCurrentTouchIdx(newTouchIdx);
                } else {
                    logToUI("already last touch");
                }
                break;
            case 3:
                logToUI("gotoMove Next Point");
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
        const newTouchIdx = {
            pointIdx: currentTouchIdx.pointIdx+1,
            teamTouchesIdx: 0,
            touchIdx: 0
        } as TouchIndex;
        const newScore = calculateScore(game, newTouchIdx);
        //logToUI("score... team, lastserv team, score[team]", team, lastServingTeam, scoreTeam[team])
        //logToUI("team "+team+" scores... ", ''+scoreTeam[0], ''+scoreTeam[1])
        const isLastSet = newScore.setsTeam[0]+newScore.setsTeam[1] >=2;
        const rotationPace = isLastSet ? 5 : 7;
        //renderServingPosition(team, 0, Math.floor((scoreTeam[0]+scoreTeam[1])/rotationPace)%2===1);
        logToUI("team "+team+" scores... "+ ''+newScore.scoreTeam[0]+ ''+newScore.scoreTeam[1])
        logToUI("rotation swap... "+ (newScore.scoreTeam[0]+newScore.scoreTeam[1])/rotationPace)
        logToUI("rotation swap2... "+ Math.floor((newScore.scoreTeam[0]+newScore.scoreTeam[1])/rotationPace)%2)

        game.points.push({
            set: newScore.setsTeam[0]+newScore.setsTeam[1],
            teamTouches: []
        });
        setScore(newScore);
        setCurrentTouchIdx(newTouchIdx);

        renderServingPosition(
            newServingTeam,
            Math.floor((newScore.scoreTeam[0]+newScore.scoreTeam[1])/rotationPace)%2===1,
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
        logToUI("touch "+sideOutState+" "+JSON.stringify(currentTouchIdx))
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
            setCurrentTouchIdx(JSON.parse(JSON.stringify(currentTouchIdx)))
        } else {
            logToUI("not in edit mode, touch ignored");
        }
    }
    const gestureTap = Gesture.Tap().onStart(onFieldTouch);

    if (!ball || !field || !taru || !niina || !anaPatricia || !duda) {
        return <Text>Image is loading...</Text>;
    }
    if(!isEditMode) {
        renderTouchIndex(game,currentTouchIdx);
    }
    console.log("RENDER------------------------------------------------")
    return (
        <View style={styles.container}>
            <ButtonGroup
                buttons={['  '+score.scoreTeam[0]+ '  ', '  '+score.scoreTeam[1]+ '  ']}
                selectedIndex={lastServingTeam}
                onPress={teamScores}
                containerStyle={{ marginBottom: 20 }}
                textStyle={styles.textButton}
            />
            <ButtonGroup
                buttons={['  '+score.setsTeam[0]+ '  ', '  '+score.setsTeam[1]+ '  ']}
                selectedIndex={2}
                containerStyle={{ marginBottom: 20 }}
                textStyle={styles.smallTextButton}
            />
            <GestureDetector gesture={gestureTap}>
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
            <Text>{debugText[debugText.length-6]}</Text>
            <Text>{debugText[debugText.length-5]}</Text>
            <Text>{debugText[debugText.length-4]}</Text>
            <Text>{debugText[debugText.length-3]}</Text>
            <Text>{debugText[debugText.length-2]}</Text>
            <Text>{debugText[debugText.length-1]}</Text>
            <Text>---------------------------------------------------------------------</Text>
            <Text>{JSON.stringify(currentTouchIdx)}</Text>

            <ButtonGroup
                buttons={[ '\u{300a}', '\u{2329}', '\u{232a}', '\u{300b}']}
                selectedIndex={10}
                containerStyle={{ marginBottom: 20 }}
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
    }
});

