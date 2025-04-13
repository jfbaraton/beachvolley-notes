import { useState, useEffect } from 'react';
import { ButtonGroup } from '@rneui/themed'

import { useWindowDimensions, StyleSheet, View  } from 'react-native';
import {Canvas,Text, Circle, Group, useImage, Image} from "@shopify/react-native-skia";
import {useSharedValue, withTiming} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

import { initGame, initTeams, initPlayerPositions, Player, Team, Touch, Game, FieldGraphicConstants } from '@/utils/BeachVolleyUtils';

import BallFront from '@/assets/sprites/ball.png';
import FieldFront from '@/assets/sprites/field.jpg';
import TaruFront from '@/assets/sprites/Taru.png';
import NiinaFront from '@/assets/sprites/Niina.jpg';
import AnaPatriciaFront from '@/assets/sprites/AnaPatricia.png';
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
    const serverMateY = height/2;
    const serverBlockerMateX = width/7;
    const serverBlockerMateY = 3*height/4;
    const receiverX = 6*width/7;
    const receiverY = height/4;

    const sideOutState          = useSharedValue('service'); // pass, set, attack.
    const [ lastServingTeam, setLastServingTeam ] = useState(0); // 0 = finland, 1 = brazil

    const validateBallX =   (oneBallX) => Math.min(Math.max(0,oneBallX-ballsize/2), width-ballsize)
    const validateBallY =   (oneBallY) => Math.min(Math.max(0,oneBallY-ballsize/2), height-ballsize)
    const validatePlayerX = (onePlayerX) => Math.min(Math.max(0,onePlayerX-playerSize/2), width-playerSize)
    const validatePlayerY = (onePlayerY) => Math.min(Math.max(0,onePlayerY-playerSize/2), height-playerSize)

    const fieldGraphicConstants = {
        width: width,
        height: height,
        ballsize: ballsize,
        servingPosX: servingPosX,
        servingPosY: servingPosY,
        serverMateX: serverMateX,
        serverMateY: serverMateY,
        serverBlockerMateX: serverBlockerMateX,
        serverBlockerMateY: serverBlockerMateY,
        receiverX: receiverX,
        receiverY: receiverY,
        validateBallX: validateBallX,
        validateBallY: validateBallY,
        validatePlayerX: validatePlayerX,
        validatePlayerY: validatePlayerY
    } as FieldGraphicConstants;

    const ball = useImage(BallFront.uri, {
         maxWidth: 800,
         onError(error, retry) {
           console.error('Loading failed:', error.message);
         }
    });
    const field = useImage(FieldFront.uri, {
         maxWidth: 800,
         onError(error, retry) {
           console.error('Loading failed:', error.message);
         }
    });
    const taru = useImage(TaruFront.uri, {
         maxWidth: 800,
         onError(error, retry) {
           console.error('Loading failed:', error.message);
         }
    });
    const niina = useImage(NiinaFront.uri, {
         maxWidth: 800,
         onError(error, retry) {
           console.error('Loading failed:', error.message);
         }
    });
    const anaPatricia = useImage(AnaPatriciaFront.uri, {
         maxWidth: 800,
         onError(error, retry) {
           console.error('Loading failed:', error.message);
         }
    });
    const duda = useImage(DudaFront.uri, {
         maxWidth: 800,
         onError(error, retry) {
           console.error('Loading failed:', error.message);
         }
    });

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
    //console.log("BallFront ", JSON.stringify(BallFront))
    const [ scoreTeam, setScoreTeam ] = useState([0,0])
    const [ setsTeam, setSetsTeam ] = useState([0,0])
    if(scoreTeam[0]+scoreTeam[1]+setsTeam[0]+setsTeam[1] === 0) {
        console.log("FIRST INIT PLAYER POS ---------------------------------");
        initPlayerPositions(teams[0], false, game,setsTeam[0]+setsTeam[1], fieldGraphicConstants);
    }

    const teamScores = (team) => {
        //console.log("score... team, lastserv team, score[team]", team, lastServingTeam, scoreTeam[team])
        //console.log("team "+team+" scores... ", ''+scoreTeam[0], ''+scoreTeam[1])
        scoreTeam[team]++;
        const isLastSet = setsTeam[0]+setsTeam[1] >=2;
        const rotationPace = isLastSet ? 5 : 7;
        const pointsPerSet = isLastSet ? 15 : 21;
        if(  scoreTeam[team] >= pointsPerSet && scoreTeam[team]-scoreTeam[1-team] >= 2) {
            setsTeam[team]++;
            scoreTeam[0]=0;
            scoreTeam[1]=0;
            setSetsTeam(JSON.parse(JSON.stringify(setsTeam)));
        }
        setScoreTeam(JSON.parse(JSON.stringify(scoreTeam)));
        //initPlayerPositions(team, 0, Math.floor((scoreTeam[0]+scoreTeam[1])/rotationPace)%2===1);
        console.log("team "+team+" scores... ", ''+scoreTeam[0], ''+scoreTeam[1])
        console.log("rotation swap... ", (scoreTeam[0]+scoreTeam[1])/rotationPace)
        console.log("rotation swap2... ", Math.floor((scoreTeam[0]+scoreTeam[1])/rotationPace)%2)
        game.points.push({
            set: setsTeam[0]+setsTeam[1],
            teamTouches: []
        });
        initPlayerPositions(
            teams[0].startingSide === 0 ? teams[team] : teams[1-team],
            Math.floor((scoreTeam[0]+scoreTeam[1])/rotationPace)%2===1,
            game,
            setsTeam[0]+setsTeam[1],
            fieldGraphicConstants);
        setLastServingTeam(team);
    }
    const onFieldTouch = (event) => {
        console.log("touch ",sideOutState, event)
        let sideOutContinues = false;
        switch (sideOutState.value) {
            case 'service':
                // Check if the ball is opposite the service area
                if (event.x > width/2) {
                    console.log("service -> pass")
                    sideOutContinues = true;
                    sideOutState.value = 'pass';
                    anaPatriciaX.value = withTiming(validatePlayerX(event.x+ballsize/2),{ duration : 500});
                    anaPatriciaY.value = withTiming(validatePlayerY(event.y),{ duration : 500});
                } else {
                    console.log("service does not cross")
                }
                break;
            case 'pass':
                // Check if the ball stays in the pass area
                if (event.x > width/2) {
                    console.log("pass -> set")
                    sideOutContinues = true;
                    sideOutState.value = 'set';
                    dudaX.value = withTiming(validatePlayerX(event.x),{ duration : 500});
                    dudaY.value = withTiming(validatePlayerY(event.y+ballsize/2),{ duration : 500});
                } else {
                    console.log("pass -> pass")
                    sideOutContinues = true;
                    sideOutState.value = 'pass';
                    taruX.value = withTiming(validatePlayerX(event.x-ballsize/2),{ duration : 500});
                    taruY.value = withTiming(validatePlayerY(event.y),{ duration : 500});
                }
                break;
            case 'set':
                // Check if the ball stays in the set area
                if (event.x > width/2) {
                    console.log("set -> attack")
                    sideOutContinues = true;
                    sideOutState.value = 'attack';
                    anaPatriciaX.value = withTiming(validatePlayerX(event.x+ballsize/2),{ duration : 500});
                    anaPatriciaY.value = withTiming(validatePlayerY(event.y),{ duration : 500});
                } else {
                    console.log("set -> pass")
                    sideOutContinues = true;
                    sideOutState.value = 'pass';
                    taruX.value = withTiming(validatePlayerX(event.x-ballsize/2),{ duration : 500});
                    taruY.value = withTiming(validatePlayerY(event.y),{ duration : 500});
                }
                break;
            case 'attack':
                // Check if the ball stays in the set area
                if (event.x > width/2) {
                    console.log("attack failed")
                    sideOutContinues = false;
                    sideOutState.value = 'service';
                    teamScores(0);
                } else {
                    console.log("attack -> pass")
                    sideOutContinues = true;
                    sideOutState.value = 'pass';
                    taruX.value = withTiming(validatePlayerX(event.x-ballsize/2),{ duration : 500});
                    taruY.value = withTiming(validatePlayerY(event.y),{ duration : 500});
                }
                break;
        }
        if(sideOutContinues) {
            console.log("move ball ",validateBallX(event.x), validateBallY(event.y))
            ballX.value = withTiming(validateBallX(event.x),{ duration : 1000});
            ballY.value = withTiming(validateBallY(event.y),{ duration : 1000});
        }
    }
    const gestureTap = Gesture.Tap().onStart(onFieldTouch);

    if (!ball || !field || !taru || !niina || !anaPatricia || !duda) {
        return <Text>Image is loading...</Text>;
    }
    return (
        <View style={styles.container}>
            <ButtonGroup
                buttons={['  '+scoreTeam[0]+ '  ', '  '+scoreTeam[1]+ '  ']}
                selectedIndex={lastServingTeam}
                onPress={teamScores}
                containerStyle={{ marginBottom: 20 }}
                textStyle={{ "font-size": "2.8rem" }}
            />
            <ButtonGroup
                buttons={['  '+setsTeam[0]+ '  ', '  '+setsTeam[1]+ '  ']}
                selectedIndex={2}
                containerStyle={{ marginBottom: 20 }}
                textStyle={{ "font-size": "1rem" }}
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
    }
});

