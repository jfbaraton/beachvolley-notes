import {StyleSheet} from 'react-native';
import {View} from '@/components/Themed';
import {Canvas, Text, useFont, Fill} from "@shopify/react-native-skia";
import React from "react";


export default function TabOneScreen() {
    const fontSize = 32;
    const font = useFont(require("@/assets/fonts/SpaceMono-Regular.ttf"), fontSize);
    return (
        <View style={styles.container}>
            <View style={[gridStyles.container, {'alignCenter': 'center'}]}>
              <View style={[gridStyles.box, {textAlign: 'center'}]} >

                    <Text style={gridStyles.boxTitle} > sleep</Text>
                    <View style={[gridStyles.box, {textAlign: 'center'}]} >


                      </View>
              </View>


            </View>
            <br/>
            <br/>
            <Canvas style={styles.skia}>
                <Text
                    x={0}
                    y={fontSize}
                    text={"Heyas"}
                    font={font}
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
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: '80%',
    },
});

const gridStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexWrap: 'wrap',
    marginTop: 8,
    backgroundColor: 'aliceblue',
    maxHeight: 400,
  },
  box: {
    maxHeight: 400,
    minWidth: 50,
    minHeight: 80,
    backgroundColor: 'midnightblue',
  },
  boxTitle: {
    textAlign: 'center',
    color: 'white',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'oldlace',
    alignSelf: 'flex-start',
    marginHorizontal: '1%',
    marginBottom: 6,
    minWidth: '48%',
    textAlign: 'center',
  },
  selected: {
    backgroundColor: 'coral',
    borderWidth: 0,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'coral',
  },
  selectedLabel: {
    color: 'white',
  },
  label: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 24,
  },
});
