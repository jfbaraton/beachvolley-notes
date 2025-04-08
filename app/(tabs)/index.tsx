import { useState, useEffect } from 'react';
import { ButtonGroup } from '@rneui/themed'

import { useWindowDimensions, StyleSheet, View  } from 'react-native';
import {Canvas,Text, Circle, Group, useImage, Image} from "@shopify/react-native-skia";
import {useSharedValue, withTiming} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

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
    const lastServer           = useSharedValue(1); // 1 = taru, 2 = niina, 3 = anaPatricia, 4 = duda
    const lastPlayer           = useSharedValue(1); // 1 = taru, 2 = niina, 3 = anaPatricia, 4 = duda
    const validateBallX =   (oneBallX) => Math.min(Math.max(0,oneBallX-ballsize/2), width-ballsize)
    const validateBallY =   (oneBallY) => Math.min(Math.max(0,oneBallY-ballsize/2), height-ballsize)
    const validatePlayerX = (onePlayerX) => Math.min(Math.max(0,onePlayerX-playerSize/2), width-playerSize)
    const validatePlayerY = (onePlayerY) => Math.min(Math.max(0,onePlayerY-playerSize/2), height-playerSize)

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

    const [ scoreTeam, setScoreTeam ] = useState([0,0])
    const [ setsTeam0, setSetsTeam0 ] = useState(0)
    const [ setsTeam1, setSetsTeam1 ] = useState(0)
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
    //console.log("BallFront ", JSON.stringify(BallFront))

    useEffect(() => {
        ballX.value = withTiming(validateBallX(servingPosX+ballsize),{ duration : 1000});
        ballY.value = withTiming(validateBallX(servingPosY),{ duration : 1000});
    });

    const initPlayerPositions = (servingTeam : number, servingPlayer : number, isSideSwapped :boolean) => {

        ballX.value = withTiming(validateBallX(servingPosX+ballsize),{ duration : 1000});
        ballY.value = withTiming(validateBallX(servingPosY),{ duration : 1000});
        let p1X= taruX;
        let p1Y= taruY;
        let p2X= niinaX;
        let p2Y= niinaY;
        let p3X= anaPatriciaX;
        let p3Y= anaPatriciaY;
        let p4X= dudaX;
        let p4Y= dudaY;
        if(servingTeam ===1 !== isSideSwapped) {
            console.log("swap serving team")
            p3X= taruX;
            p3Y= taruY;
            p4X= niinaX;
            p4Y= niinaY;
            p1X= anaPatriciaX;
            p1Y= anaPatriciaY;
            p2X= dudaX;
            p2Y= dudaY;
        }
        if (servingPlayer === 1) {
            console.log("swap serving player")
            let tmp = p1X;
            p1X = p2X;
            p2X = tmp;
            tmp = p1Y;
            p1Y = p2Y;
            p2Y = tmp;
        }
        p1X.value = withTiming(validatePlayerX(servingTeam ? width - servingPosX :servingPosX),{ duration : 500});
        p1Y.value = withTiming(validatePlayerY(servingPosY),{ duration : 500});
        p2X.value = withTiming(validatePlayerX(servingTeam ? width - serverMateX:serverMateX),{ duration : 500});
        p2Y.value = withTiming(validatePlayerY(serverMateY),{ duration : 500});
        p3X.value = withTiming(validatePlayerX(servingTeam ? width - receiverX:receiverX),{ duration : 500});
        p3Y.value = withTiming(validatePlayerY(receiverY),{ duration : 500});
        //console.log("receiving player 2 ", receiverX, height - receiverY ,receiverY , height)
        p4X.value = withTiming(validatePlayerX(servingTeam ? width - receiverX:receiverX),{ duration : 500});
        p4Y.value = withTiming(validatePlayerY(height - receiverY),{ duration : 500});
        ballX.value = withTiming(validateBallX(servingTeam ? width - (servingPosX+ballsize):(servingPosX+ballsize)),{ duration : 50});
        ballY.value = withTiming(validateBallY(servingPosY),{ duration : 50});
    }
    const teamScores = (team) => {
        //console.log("score... team, lastserv team, score[team]", team, lastServingTeam, scoreTeam[team])
        //console.log("buttons... ", ''+scoreTeam[0], ''+scoreTeam[1])
        scoreTeam[team]++
        setScoreTeam(JSON.parse(JSON.stringify(scoreTeam)));
        setLastServingTeam(team);
        initPlayerPositions(team);
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
                    lastPlayer.value = 3;
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
                    lastPlayer.value = 4;
                    dudaX.value = withTiming(validatePlayerX(event.x),{ duration : 500});
                    dudaY.value = withTiming(validatePlayerY(event.y+ballsize/2),{ duration : 500});
                } else {
                    console.log("pass -> pass")
                    sideOutContinues = true;
                    sideOutState.value = 'pass';
                    lastPlayer.value = 1;
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
                    lastPlayer.value = 4;
                    anaPatriciaX.value = withTiming(validatePlayerX(event.x+ballsize/2),{ duration : 500});
                    anaPatriciaY.value = withTiming(validatePlayerY(event.y),{ duration : 500});
                } else {
                    console.log("set -> pass")
                    sideOutContinues = true;
                    sideOutState.value = 'pass';
                    lastPlayer.value = 1;
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
                    lastPlayer.value = 1;
                    teamScores(0);
                } else {
                    console.log("attack -> pass")
                    sideOutContinues = true;
                    sideOutState.value = 'pass';
                    lastPlayer.value = 1;
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

