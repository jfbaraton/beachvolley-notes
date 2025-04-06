import { useState, useEffect } from 'react';

import { useWindowDimensions, StyleSheet, View  } from 'react-native';
import {Canvas,Text, Circle, Group, useImage, Image} from "@shopify/react-native-skia";
import {useSharedValue, withTiming} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";

import {Star} from '@/components/Star';
import { Asset } from 'expo-asset';
import BallFront from '@/assets/sprites/ball.png';
import FieldFront from '@/assets/sprites/field.jpg';

export default function TabTwoScreen() {
    //const { width, height } = useWindowDimensions();
    const width = 720;
    const height = 370;
    const ballsize = width/10;

    const validateBallX = (oneBallX) => Math.min(Math.max(0,oneBallX-ballsize/2), width-ballsize)
    const validateBallY = (oneBallY) => Math.min(Math.max(0,oneBallY-ballsize/2), height-ballsize)

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

    const ballX = useSharedValue(validateBallX(width/7))
    const ballY = useSharedValue(validateBallY(height/2))
    //console.log("BallFront ", JSON.stringify(BallFront))

    useEffect(() => {
        ballX.value = withTiming(validateBallX(width/2),{ duration : 1000});
    });

    const onFieldTouch = (event) => {
        console.log("touch ", event)
        ballX.value = withTiming(validateBallX(event.x),{ duration : 1000});
        ballY.value = withTiming(validateBallX(event.y),{ duration : 1000});
    }
    const gestureTap = Gesture.Tap().onStart(onFieldTouch);

    if (!ball || !field) {
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

