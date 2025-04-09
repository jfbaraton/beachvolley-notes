import {PathCommand, vec, Vector} from "@shopify/react-native-skia";


interface Player {
    id: number;
    playerX: number; // reference to the shared value playerX.value
    playerY: number; // reference to the shared value playerY.value

}

interface Team {
    players: Player[];
    startingSide: number; // 0 matches idx, 1 opposite of idx. team 0 is defaulting to left
    prefersBlockId: number; // 0 no opinion, Player.id
}


interface Touch {
    playerId: number;
    stateName: string; // 'service', 'pass', 'set', 'attack'
    subStateName: string; // 'block', 'retouch afterblock', 'joust', spike, cut, pokie, rainbow, handset, bumpset, etc
    startingSide: number; // 0 left, 1 right
    endingSide: number; // 0 left, 1 right
    fromAcross: boolean; // 0 no, 1 if ball comes from a diagonal angle
    toAcross: boolean; // 0 no, 1 if ball comes from a diagonal angle
    isScoring: boolean; // 0 no, 1 yes
    isFail: boolean; // 0 no, 1 yes
    playerExplicitMoves: object[]; // array of player ids, X, Y, reason (block, drop, call, etc) when set by the User
    setCall: string; // 'up', 'middle', 'antenna', 'back'
}

interface Touches {
    team: Team;
    touches: Touch[];
}

interface Point {
    touches: Touch[];
}
interface Game {
    gameTitle: string; // Olympics 2024 round of 16 FRA vs SUI
    teams: Team[];
    windStrength: number; // m/s
    windAngle: number; // 0 is left to right, 90 is upwards, 180 is right to left, 270 is downwards
    sideOuts: Point[];
}

export const initGame = () : Game => {
    "worklet";
    let result :Game = {
        gameTitle: 'Olympics 2024 round of 16 FRA vs SUI', // Olympics 2024 round of 16 FRA vs SUI
        //teams: Team[],
        //windStrength: number, // m/s
        //windAngle: number, // 0 is left to right, 90 is upwards, 180 is right to left, 270 is downwards
        sideOuts: [] as Point[]
    } as Game;

    return result;
}
