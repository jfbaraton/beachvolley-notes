import { useState } from 'react';
import { useImage,Image } from 'expo-image';

import { useWindowDimensions, StyleSheet, View  } from 'react-native';
import {Canvas,Text, Circle, Group} from "@shopify/react-native-skia";
import {Star} from '@/components/Star';
import { Asset } from 'expo-asset';
//const IMAGE = Asset.fromModule(require('../../assets/sprites/ball.png'));

export default function TabTwoScreen() {
    const { width, height } = useWindowDimensions();
    const image = useImage('../../assets/assets/sprites/ball.png', {
        maxWidth: 800,
        onError(error, retry) {
          console.error('Loading failed:', error.message);
        }
      });

    console.log("dims ", width, height)

   //const bg = useImage(require('./../../assets/sprites/field.jpg'));
   //const bg = useImage(require("@/assets/sprites/field.jpg"));
    //const ball = useImage(require('../../assets/sprites/ball.png'));
 ///  transform={[{ rotate: -90 }]}
 // <Image image={bg} width={width} height={height}  fit={'cover'}/>
    const r = width/2 * 0.33;
    if (!image) {
        return <Text>Image is loading...</Text>;
    }
    console.log("img ", image.width, image.height, image.localUri, image.uri)
    return (
        <View style={styles.container}>
               <Image
                    source={"http://localhost:8081/assets/assets/sprites/ball.png"}

                    style={styles.image}
                    contentFit="cover"
                    transition={1000}

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
    }
});

