import {PathCommand, vec, Vector} from "@shopify/react-native-skia";


interface Player {
    id: number;
    playerX: object; // reference to the shared value playerX.value
    playerY: object; // reference to the shared value playerY.value

}

interface Team {
    players: Player[];
    startingSide: number; // 0 matches idx, 1 opposite of idx. team 0 is defaulting to left
    prefersBlockId: number; // 0 no opinion, Player.id
}


interface Touch {
    playerId: number;
    ballX: number;
    ballY: number;

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
/*
export const initPlayerPositions = (game: Game) => {
        const servingTeam : number = 0;
        const servingPlayer : number = 0;
        const isSideSwapped :boolean = false;
        let p1X= taruX;
        let p1Y= taruY;
        let p2X= niinaX;
        let p2Y= niinaY;
        let p3X= anaPatriciaX;
        let p3Y= anaPatriciaY;
        let p4X= dudaX;
        let p4Y= dudaY;
        if(servingTeam ===1) {
            console.log("swap serving team ",servingTeam===1)
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
        p1X.value = withTiming(validatePlayerX(servingTeam===1 !== isSideSwapped? width - servingPosX :servingPosX),{ duration : 500});
        p1Y.value = withTiming(validatePlayerY(servingPosY),{ duration : 500});
        p2X.value = withTiming(validatePlayerX(servingTeam===1 !== isSideSwapped ? width - serverMateX:serverMateX),{ duration : 500});
        p2Y.value = withTiming(validatePlayerY(serverMateY),{ duration : 500});
        p3X.value = withTiming(validatePlayerX(servingTeam===1 !== isSideSwapped ? width - receiverX:receiverX),{ duration : 500});
        p3Y.value = withTiming(validatePlayerY(receiverY),{ duration : 500});
        //console.log("receiving player 2 ", receiverX, height - receiverY ,receiverY , height)
        p4X.value = withTiming(validatePlayerX(servingTeam===1 !== isSideSwapped ? width - receiverX:receiverX),{ duration : 500});
        p4Y.value = withTiming(validatePlayerY(height - receiverY),{ duration : 500});
        ballX.value = withTiming(validateBallX(servingTeam===1 !== isSideSwapped ? width - (servingPosX+ballsize):(servingPosX+ballsize)),{ duration : 50});
        ballY.value = withTiming(validateBallY(servingPosY),{ duration : 50});
    }*/
