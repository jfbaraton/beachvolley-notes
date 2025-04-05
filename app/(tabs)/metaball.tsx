import { useState } from 'react';

import { useWindowDimensions, StyleSheet, View  } from 'react-native';
import {Canvas,Text, Circle, Group, useImage, Image} from "@shopify/react-native-skia";
import {Star} from '@/components/Star';
import { Asset } from 'expo-asset';
import BallFront from '@/assets/sprites/ball.png';
import FieldFront from '@/assets/sprites/field.jpg';

export default function TabTwoScreen() {
    //const { width, height } = useWindowDimensions();
    const width = 520;
    const height = 420;

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

    //console.log("BallFront ", JSON.stringify(BallFront))

    if (!ball || !field) {
        return <Text>Image is loading...</Text>;
    }
    return (
        <View style={styles.container}>
            <Canvas style={{ width, height }}>
               <Image
                    image={field}
                    width={520}
                    height={220}
                    fit={'cover'}

               />
               <Image
                    image={ball}
                    width={120}
                    height={120}
                    fit={'cover'}

               />
            </Canvas>
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

