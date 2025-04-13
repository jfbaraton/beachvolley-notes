import { withTiming} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

export interface FieldGraphicConstants {
    width: number;
    height: number;
    ballsize: number;
    servingPosX: number;
    servingPosY: number;
    serverMateX: number;
    serverMateY: number;
    serverBlockerMateX: number;
    serverBlockerMateY: number;
    receiverX: number;
    receiverY: number;
    validateBallX: Function;
    validateBallY: Function;
    validatePlayerX: Function;
    validatePlayerY: Function;
}

export interface Player {
    id: string;
    playerX: SharedValue<number>; // reference to the shared value playerX.value
    playerY: SharedValue<number>; // reference to the shared value playerY.value

}

export interface Team {
    id:string;
    players: Player[];
    startingSide: number; // 0 matches idx, 1 opposite of idx. team 0 is defaulting to left
    prefersBlockId: number; // 0 no opinion, Player.id
}

export const initTeams = (
    p1: Player,
    p2: Player,
    p3: Player,
    p4: Player,
    team1Name:string,
    team2Name:string
    ) : Team[] => {
    "worklet";
    let result :Team[] = [{
        id : team1Name,
        players: [p1, p2],
        startingSide: 0, // 0 matches idx, 1 opposite of idx. team 0 is defaulting to left
        prefersBlockId: p2.id, // 0 no opinion, Player.id
    },{
        id : team2Name,
        players: [p3, p4],
        startingSide: 0, // 0 matches idx, 1 opposite of idx. team 0 is defaulting to left
        prefersBlockId: 0, // 0 no opinion, Player.id
    }] as Team[];

    return result;
}

export interface Touch {
    player: Player;
    ballX?: number;
    ballY?: number;

    stateName: string; // 'service', 'pass', 'set', 'attack'
    subStateName?: string; // 'block', 'retouch afterblock', 'joust', spike, cut, pokie, rainbow, handset, bumpset, etc
    startingSide?: number; // 0 left, 1 right
    endingSide?: number; // 0 left, 1 right
    fromAcross?: boolean; // 0 no, 1 if ball comes from a diagonal angle
    toAcross?: boolean; // 0 no, 1 if ball comes from a diagonal angle
    isScoring?: boolean; // 0 no, 1 yes
    isFail?: boolean; // 0 no, 1 yes
    playerExplicitMoves?: object[]; // array of player ids, X, Y, reason (block, drop, call, etc) when set by the User
    setCall?: string; // 'up', 'middle', 'antenna', 'back'
}

export interface TeamTouches {
    team: Team;
    touch: Touch[];
}

interface Point {
    teamTouches: TeamTouches[];
}
export interface Game {
    ballX: SharedValue<number>; // reference to the shared value ballX.value
    ballY: SharedValue<number>; // reference to the shared value ballX.value
    gameTitle: string; // Olympics 2024 round of 16 FRA vs SUI
    teams: Team[];
    windStrength: number; // m/s
    windAngle: number; // 0 is left to right, 90 is upwards, 180 is right to left, 270 is downwards
    points: Point[];
}


export const initGame = (ballX: SharedValue<number>, ballY: SharedValue<number>, teams:Team[]) : Game => {
    "worklet";
    let result :Game = {
        ballX: ballX, // reference to the shared value ballX.value
        ballY: ballY, // reference to the shared value ballX.value
        gameTitle: 'Olympics 2024 round of 16 FRA vs SUI', // Olympics 2024 round of 16 FRA vs SUI
        teams: teams,
        //windStrength: number, // m/s
        //windAngle: number, // 0 is left to right, 90 is upwards, 180 is right to left, 270 is downwards
        points: [] as Point[]
    } as Game;

    return result;
}

export const initPlayerPositions = (currentServingTeam:Team, isSideSwapped :boolean, game: Game, fieldConstants:FieldGraphicConstants) => {
    console.log("initPlayerPositions ("+game.points.length+")", currentServingTeam.id, isSideSwapped, "--------------------------------------")
    /*const isFirstTouch =
        !game.points ||
        game.points.length === 0 ||
        !game.points[game.points.length-1].teamTouches ||
        game.points[game.points.length-1].teamTouches.length === 0 ||
        !game.points[game.points.length-1].teamTouches[game.points[game.points.length-1].teamTouches.length-1].touch||
        game.points[game.points.length-1].teamTouches[game.points[game.points.length-1].teamTouches.length-1].touch.length === 0;*/
    if(!game.points ||
        game.points.length === 0) {
        console.log("init game.points ");
        game.points = [{
            teamTouches: []
        }];
    }
    const currentPoint = game.points[game.points.length - 1];
    console.log("currentPoint ",currentPoint);
    if(!currentPoint.teamTouches ||
        currentPoint.teamTouches.length === 0) {
        console.log("init currentPoint.teamTouches ");
        currentPoint.teamTouches = [];
    }
    const currentTouches = currentPoint.teamTouches;
    console.log("currentTouches ",currentTouches);
    if(!currentTouches.length || !currentTouches[0].team) {
        console.log("set Team of currentPoint.teamTouches ");
        currentTouches.push({
            team: currentServingTeam,
            touch: []
        });
    }
    let currentTeamTouch = currentTouches[currentTouches.length-1].touch;
    console.log("currentTeamTouch ",currentTeamTouch);

    // serving player is 1 if team started serving / gained service an even number of times
    const teamsNewServes = game.points.filter( (point, idx) => idx ===0 ||
        point.teamTouches[0].team.id !== game.points[idx-1].teamTouches[0].team.id)
        .filter(point=>point.teamTouches[0].team.id === currentServingTeam.id)
        .map((point, idx) => {
            return {
            teamId:point.teamTouches[0].team.id,
            playerId: point.teamTouches[0].touch.length ? point.teamTouches[0].touch[0].player.id : -1
        };});
    console.log("teamsNewServes ",JSON.stringify(teamsNewServes));
    const servingPlayer : number = 1-(teamsNewServes.length%2);
    console.log("servingPlayer ",servingPlayer)
    if(!currentTeamTouch.length) {
        currentTeamTouch.push({
            player: currentServingTeam.players[servingPlayer],
            //ballX: number,
            //ballY: number,

            stateName: 'service', // 'service', 'pass', 'set', 'attack'
            //subStateName: string, // 'block', 'retouch afterblock', 'joust', spike, cut, pokie, rainbow, handset, bumpset, etc
            startingSide: 0, // 0 left, 1 right
            //endingSide: number, // 0 left, 1 right
            //fromAcross: boolean, // 0 no, 1 if ball comes from a diagonal angle
            //toAcross: boolean, // 0 no, 1 if ball comes from a diagonal angle
            //isScoring: boolean, // 0 no, 1 yes
            //isFail: boolean, // 0 no, 1 yes
            //playerExplicitMoves: object[], // array of player ids, X, Y, reason (block, drop, call, etc) when set by the User
            //setCall: string, // 'up', 'middle', 'antenna', 'back'
        });
    }
    let currentTouch = currentTeamTouch[currentTouches.length-1];
    const firstServingTeam = game.points[0].teamTouches[0].team;
    //const currentServingTeam = currentTouches[0].team;
    const servingTeam : boolean = firstServingTeam.players[0].id !== currentServingTeam.players[0].id; // true if the current serving team is not the first serving team


    let taruX = game.teams[0].players[0].playerX;
    let taruY = game.teams[0].players[0].playerY;
    let niinaX = game.teams[0].players[1].playerX;
    let niinaY = game.teams[0].players[1].playerY;
    let anaPatriciaX = game.teams[1].players[0].playerX;
    let anaPatriciaY = game.teams[1].players[0].playerY;
    let dudaX = game.teams[1].players[1].playerX;
    let dudaY = game.teams[1].players[1].playerY;

    let p1X = taruX;
    let p1Y= taruY;
    let p2X= niinaX;
    let p2Y= niinaY;
    let p3X= anaPatriciaX;
    let p3Y= anaPatriciaY;
    let p4X= dudaX;
    let p4Y= dudaY;
    if(servingTeam) {
        console.log("swap serving team ",servingTeam)
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
    p1X.value = withTiming(fieldConstants.validatePlayerX(servingTeam !== isSideSwapped? fieldConstants.width - fieldConstants.servingPosX :fieldConstants.servingPosX),{ duration : 500});
    p1Y.value = withTiming(fieldConstants.validatePlayerY(fieldConstants.servingPosY),{ duration : 500});
    p2X.value = withTiming(fieldConstants.validatePlayerX(servingTeam !== isSideSwapped ? fieldConstants.width - fieldConstants.serverMateX:fieldConstants.serverMateX),{ duration : 500});
    p2Y.value = withTiming(fieldConstants.validatePlayerY(fieldConstants.serverMateY),{ duration : 500});
    p3X.value = withTiming(fieldConstants.validatePlayerX(servingTeam !== isSideSwapped ? fieldConstants.width - fieldConstants.receiverX:fieldConstants.receiverX),{ duration : 500});
    p3Y.value = withTiming(fieldConstants.validatePlayerY(fieldConstants.receiverY),{ duration : 500});
    //console.log("receiving player 2 ", receiverX, height - receiverY ,receiverY , height)
    p4X.value = withTiming(fieldConstants.validatePlayerX(servingTeam !== isSideSwapped ? fieldConstants.width - fieldConstants.receiverX:fieldConstants.receiverX),{ duration : 500});
    p4Y.value = withTiming(fieldConstants.validatePlayerY(fieldConstants.height - fieldConstants.receiverY),{ duration : 500});
    game.ballX.value = withTiming(fieldConstants.validateBallX(servingTeam !== isSideSwapped ? fieldConstants.width - (fieldConstants.servingPosX+fieldConstants.ballsize):(fieldConstants.servingPosX+fieldConstants.ballsize)),{ duration : 50});
    game.ballY.value = withTiming(fieldConstants.validateBallY(fieldConstants.servingPosY),{ duration : 50});
}
