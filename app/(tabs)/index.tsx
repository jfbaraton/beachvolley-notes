import { useState, useEffect } from 'react';

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
    //const { width, height } = useWindowDimensions();
    const width = 720;
    const height = 370;
    const ballsize = width/10;
    const playerSize = width/10;

    const [ sideOutState, setSideOutState ]         = useState('service'); // pass, set, attack.
    const [ lastServingTeam, setLastServingTeam ]   = useState(1); // 1 = finland, 2 = brazil
    const [ lastServer, setServer ]                 = useState(1); // 1 = taru, 2 = niina, 3 = anaPatricia, 4 = duda
    const [ lastPlayer, setLastPlayer ]             = useState(1); // 1 = taru, 2 = niina, 3 = anaPatricia, 4 = duda
    const validateBallX = (oneBallX) => Math.min(Math.max(0,oneBallX-ballsize/2), width-ballsize)
    const validateBallY = (oneBallY) => Math.min(Math.max(0,oneBallY-ballsize/2), height-ballsize)
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

    const ballX = useSharedValue(validateBallX(width/7))
    const ballY = useSharedValue(validateBallY(height/2))
    const taruX = useSharedValue(validatePlayerX(width/7))
    const taruY = useSharedValue(validatePlayerY(height/4))
    const niinaX = useSharedValue(validatePlayerX(width/7))
    const niinaY = useSharedValue(validatePlayerY(3*height/4))
    const anaPatriciaX = useSharedValue(validatePlayerX(6*width/7))
    const anaPatriciaY = useSharedValue(validatePlayerY(height/4))
    const dudaX = useSharedValue(validatePlayerX(6*width/7))
    const dudaY = useSharedValue(validatePlayerY(3*height/4))
    //console.log("BallFront ", JSON.stringify(BallFront))

    useEffect(() => {
        ballX.value = withTiming(validateBallX(width/2),{ duration : 1000});
    });


    const onFieldTouch = (event) => {
        console.log("touch ", event)
        let newPhase = false;
        switch (sideOutState) {
            case 'service':
                // Check if the ball is opposite the service area
                if (event.x > width/2) {
                    console.log("service -> pass")
                    newPhase = true;
                    setSideOutState('pass');
                    setLastPlayer(3);
                    //anaPatriciaX.value = withTiming(validatePlayerX(event.x+ballsize/2),{ duration : 500});
                    //anaPatriciaY.value = withTiming(validatePlayerY(event.y),{ duration : 500});
                } else {
                    console.log("service does not cross")
                }
                break;
            case 'pass':
                // Check if the ball stays in the pass area
                if (event.x > width/2) {
                    console.log("pass -> set")
                    newPhase = true;
                    setSideOutState('set');
                    setLastPlayer(4);
                    dudaX.value = withTiming(validatePlayerX(event.x),{ duration : 500});
                    dudaY.value = withTiming(validatePlayerY(event.y+ballsize/2),{ duration : 500});
                } else {
                    console.log("pass -> pass")
                    newPhase = true;
                    setSideOutState('pass');
                    setLastPlayer(1);
                    taruX.value = withTiming(validatePlayerX(event.x-ballsize/2),{ duration : 500});
                    taruY.value = withTiming(validatePlayerY(event.y),{ duration : 500});
                }
                break;
            case 'set':
                // Check if the ball stays in the set area
                if (event.x > width/2) {
                    console.log("set -> attack")
                    newPhase = true;
                    setSideOutState('attack');
                    setLastPlayer(4);
                    anaPatriciaX.value = withTiming(validatePlayerX(event.x),{ duration : 500});
                    anaPatriciaY.value = withTiming(validatePlayerY(event.y-ballsize/2),{ duration : 500});
                } else {
                    console.log("set -> pass")
                    newPhase = true;
                    setSideOutState('pass');
                    setLastPlayer(1);
                    taruX.value = withTiming(validatePlayerX(event.x-ballsize/2),{ duration : 500});
                    taruY.value = withTiming(validatePlayerY(event.y),{ duration : 500});
                }
                break;
            case 'attack':
                // Check if the ball stays in the set area
                if (event.x > width/2) {
                    console.log("attack failed")
                    newPhase = false;
                    setSideOutState('service');
                    setLastPlayer(1);
                    const servingPosX = 0;
                    const servingPosY = height/4;
                    ballX.value = withTiming(validateBallX(servingPosX+ballsize),{ duration : 1000});
                    ballY.value = withTiming(validateBallY(servingPosY),{ duration : 1000});
                    taruX.value = withTiming(validatePlayerX(servingPosX),{ duration : 500});
                    taruY.value = withTiming(validatePlayerY(servingPosY),{ duration : 500});
                } else {
                    console.log("attack -> pass")
                    newPhase = true;
                    setSideOutState('pass');
                    setLastPlayer(1);
                    taruX.value = withTiming(validatePlayerX(event.x-ballsize/2),{ duration : 500});
                    taruY.value = withTiming(validatePlayerY(event.y),{ duration : 500});
                }
                break;
        }
        if(newPhase) {
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

