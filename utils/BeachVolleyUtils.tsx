import { withTiming} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

export interface FieldGraphicConstants {
    width: number;
    height: number;
    ballsize: number;
    servingPosX: number;
    servingPosY: number;
    blockingX: number;
    serverMateX: number;
    serverMateY: number;
    serverBlockerMateX: number;
    serverBlockerMateY: number;
    receiverX: number;
    receiverY: number;
    approachX: number;
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

export interface CalculatedPlayer {
    id: string;
    x: number; // reference to the shared value playerX.value
    y: number; // reference to the shared value playerY.value
    reason?:string; // reason (block, drop, call, etc)
}

export interface Team {
    id:string;
    players: Player[];
    startingSide: number; // 0 matches idx, 1 opposite of idx. team 0 is defaulting to left
    prefersBlockId: string; // null no opinion, Player.id
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
        prefersBlockId: p2.id, // null no opinion, Player.id
    },{
        id : team2Name,
        players: [p3, p4],
        startingSide: 0, // 0 matches idx, 1 opposite of idx. team 0 is defaulting to left
        prefersBlockId: null, // null no opinion, Player.id
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
    playerExplicitMoves?: CalculatedPlayer[]; // array of player ids, X, Y, reason (block, drop, call, etc) when set by the User
    playerCalculatedMoves?: CalculatedPlayer[]; // array of player ids, X, Y, reason (block, drop, call, etc) when set by the User
    setCall?: string; // 'up', 'middle', 'antenna', 'back'
}

export interface TeamTouches {
    team: Team;
    touch: Touch[];
}

interface Point {
    teamTouches: TeamTouches[];
    set:number;
    wonBy ?: Team; // team id
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

export interface TouchIndex {
    pointIdx: number;       // Game.points index
    teamTouchesIdx: number; // Game.points.teamTouches index
    touchIdx: number;       // Game.points.teamTouches.touch index
}

export const initGame = (ballX: SharedValue<number>, ballY: SharedValue<number>, teams:Team[] ) : Game => {
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

const savePlayerPositions = (currentTouch:Touch, players:Player[]) => {
    currentTouch.playerCalculatedMoves = players.map(onePlayer => {
        return {
            id: onePlayer.id,
            x: onePlayer.playerX.value,
            y: onePlayer.playerY.value
        };
    })
}

export const renderTouch = (game:Game, currentTouch:Touch, previousTouch:Touch) => {
    if(previousTouch && previousTouch.playerCalculatedMoves && previousTouch.playerCalculatedMoves.length) {
        game.teams.forEach(oneTeam => oneTeam.players.forEach(
            onePlayer => {
                previousTouch.playerCalculatedMoves &&
                previousTouch.playerCalculatedMoves.filter(oneCalc => oneCalc.id === onePlayer.id).forEach(oneCalc => {
                    onePlayer.playerX.value = oneCalc.x;
                    onePlayer.playerY.value = oneCalc.y;
                })
            }
        ))
        if(typeof previousTouch.ballX !== "undefined" && typeof previousTouch.ballY !== "undefined" ) {
            game.ballX.value = previousTouch.ballX;
            game.ballY.value = previousTouch.ballY;
        }
    }
    if(currentTouch && currentTouch.playerCalculatedMoves && currentTouch.playerCalculatedMoves.length) {
        game.teams.forEach(oneTeam => oneTeam.players.forEach(
            onePlayer => {
                currentTouch.playerCalculatedMoves &&
                currentTouch.playerCalculatedMoves.filter(oneCalc => oneCalc.id === onePlayer.id).forEach(oneCalc => {
                    onePlayer.playerX.value = withTiming(oneCalc.x, {duration: 500});
                    onePlayer.playerY.value = withTiming(oneCalc.y, {duration: 500});
                })
            }
        ))

        if(typeof currentTouch.ballX !== "undefined" && typeof currentTouch.ballY !== "undefined" ) {
            game.ballX.value = withTiming(currentTouch.ballX, {duration: 500});
            game.ballY.value = withTiming(currentTouch.ballY, {duration: 500});
        }
    }
}

export const getPreviousPointIndex = (game:Game, touchIndex: TouchIndex) : TouchIndex | null => {

    if(touchIndex.teamTouchesIdx>0) {
        return {
            pointIdx: touchIndex.pointIdx,
            teamTouchesIdx: touchIndex.teamTouchesIdx-1,
            touchIdx: game.points[touchIndex.pointIdx].teamTouches[touchIndex.teamTouchesIdx-1].touch.length-1
        } as TouchIndex
    }
    if(touchIndex.pointIdx>0) {
        return {
            pointIdx: touchIndex.pointIdx-1,
            teamTouchesIdx: game.points[touchIndex.pointIdx-1].teamTouches.length-1,
            touchIdx: game.points[touchIndex.pointIdx-1].teamTouches[game.points[touchIndex.pointIdx-1].teamTouches.length-1].touch.length-1
        } as TouchIndex
    }

    return null;
}

export const getPreviousTouchIndex = (game:Game, touchIndex: TouchIndex) : TouchIndex | null => {
    if(touchIndex.touchIdx>0) {
        return {
            pointIdx: touchIndex.pointIdx,
            teamTouchesIdx: touchIndex.teamTouchesIdx,
            touchIdx: touchIndex.touchIdx-1
        } as TouchIndex
    }
    return getPreviousPointIndex(game, touchIndex);
}

export const getNextTouchIndex = (game:Game, touchIndex: TouchIndex) : TouchIndex | null => {
    if(touchIndex.touchIdx +1 <
        game.points[touchIndex.pointIdx].teamTouches[touchIndex.teamTouchesIdx].touch.length) {

        return {
            pointIdx: touchIndex.pointIdx,
            teamTouchesIdx: touchIndex.teamTouchesIdx,
            touchIdx: touchIndex.touchIdx+1
        } as TouchIndex;

    }

    return getNextPointIndex(game, touchIndex);
}

export const getNextPointIndex = (game:Game, touchIndex: TouchIndex) : TouchIndex | null => {

    if(touchIndex.teamTouchesIdx +1 <
        game.points[touchIndex.pointIdx].teamTouches.length) {

        return {
            pointIdx: touchIndex.pointIdx,
            teamTouchesIdx: touchIndex.teamTouchesIdx + 1,
            touchIdx: 0
        } as TouchIndex
    }

    if(touchIndex.pointIdx +1 <
        game.points.length) {

        return {
            pointIdx: touchIndex.pointIdx+1,
            teamTouchesIdx: 0,
            touchIdx: 0
        } as TouchIndex
    }

    return null;
}

export const isSameTouchIndex = (touchIndex1: TouchIndex, touchIndex2: TouchIndex) : boolean => {
    return touchIndex1.pointIdx === touchIndex2.pointIdx &&
           touchIndex1.teamTouchesIdx === touchIndex2.teamTouchesIdx &&
           touchIndex1.touchIdx === touchIndex2.touchIdx;
}

export const isLastTouchIndex = (game:Game, touchIndex: TouchIndex) : boolean => {
    try {
        return touchIndex.pointIdx === game.points.length-1 &&
            touchIndex.teamTouchesIdx === game.points[touchIndex.pointIdx].teamTouches.length-1 &&
            touchIndex.touchIdx === game.points[touchIndex.pointIdx].teamTouches[touchIndex.teamTouchesIdx].touch.length-1;
    } catch (e) {
        return false;
    }
}

export const getTouch = (game:Game, touchIndex: TouchIndex | null ) : Touch | null => {
    if(!game.points || !touchIndex || game.points.length <= touchIndex.pointIdx) return null;
    if(!game.points[touchIndex.pointIdx].teamTouches || game.points[touchIndex.pointIdx].teamTouches.length <= touchIndex.teamTouchesIdx) return null;
    if(!game.points[touchIndex.pointIdx].teamTouches[touchIndex.teamTouchesIdx].touch || game.points[touchIndex.pointIdx].teamTouches[touchIndex.teamTouchesIdx].touch.length <= touchIndex.touchIdx) return null;
    return game.points[touchIndex.pointIdx].teamTouches[touchIndex.teamTouchesIdx].touch[touchIndex.touchIdx];
}

export const renderTouchIndex = (game:Game, touchIndex: TouchIndex) => {
    renderTouch(
        game,
        getTouch(game, touchIndex) || {} as Touch,
        getTouch(game, getPreviousTouchIndex(game, touchIndex)) || {} as Touch,
        )
}

export const renderServingPosition = (currentServingTeam:Team, isSideSwapped :boolean, game: Game, currentSet:number,  fieldConstants:FieldGraphicConstants) => {
    console.log("renderServingPosition ("+game.points.length+")", currentServingTeam.id, isSideSwapped, "--------------------------------------")
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
            set:currentSet,
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
    const currentTeamTouches = currentPoint.teamTouches;
    console.log("currentTeamTouches ",currentTeamTouches);
    if(!currentTeamTouches.length || !currentTeamTouches[0].team) {
        console.log("set Team of currentPoint.teamTouches ");
        currentTeamTouches.push({
            team: currentServingTeam,
            touch: []
        });
    }
    let currentTouchArr = currentTeamTouches[currentTeamTouches.length-1].touch;
    console.log("currentTouchArr ",currentTouchArr);

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
    if(!currentTouchArr.length) {
        currentTouchArr.push({
            player: currentServingTeam.players[servingPlayer],
            ballX: game.ballX.value,
            ballY: game.ballY.value,

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
    let currentTouch = currentTouchArr[currentTouchArr.length-1];
    const firstServingTeam = game.points.filter(onePoint => onePoint.set === currentSet)[0].teamTouches[0].team;
    //const currentServingTeam = currentTouches[0].team;
    const servingTeam : boolean = firstServingTeam.id !== currentServingTeam.id; // true if the current serving team is not the first serving team


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
    savePlayerPositions(currentTouch, game.teams.flatMap(oneTeam => oneTeam.players));
}

export const getDistance = (p1x:number,p1Y:number,p2x:number,p2Y:number): number => {
    return Math.sqrt(Math.pow(p1x-p2x,2)+Math.pow(p1Y-p2Y,2));
}

export const getOtherPlayer = (team:Team, playerId:string) :Player =>{
    return team.players.find(onePlayer => onePlayer.id !== playerId) || team.players[0];
}
export const getOtherTeam = (teams:Team[], team:Team) :Team =>{
    return teams.find(oneTeam => oneTeam.id !== team.id) || teams[0];
}

export const getPlayerById = (team:Team, playerId:string) :Player =>{
    return team.players.find(onePlayer => onePlayer.id === playerId) || team.players[0];
}

export const getClosestPlayer = (team:Team, ballX :number, ballY :number) :Player =>{
    const player1Dist = getDistance(ballX, ballY, team.players[0].playerX.value, team.players[0].playerY.value);
    const player2Dist = getDistance(ballX, ballY, team.players[1].playerX.value, team.players[1].playerY.value);
    return player1Dist < player2Dist ? team.players[0] : team.players[1];
}

export const renderReceivingPosition = (ballX:number, ballY:number, game: Game, currentSet:number,  fieldConstants:FieldGraphicConstants) => {
    console.log("renderReceivingPosition ("+game.points.length+")", "--------------------------------------")

    const currentPoint = game.points[game.points.length - 1];
    //console.log("currentPoint ",currentPoint);

    const currentTeamTouches = currentPoint.teamTouches;
    //console.log("currentTeamTouches ",currentTeamTouches);

    let currentTouchArr = currentTeamTouches[currentTeamTouches.length-1].touch;
    //console.log("currentTouchArr ",currentTouchArr);

    const receivingTeam = game.teams[game.teams[0].players[0].playerX.value <= fieldConstants.width/2 === ballX <= fieldConstants.width/2 ? 0:1] ;
    console.log("receivingTeam ",receivingTeam.id);
    const receivingPlayer = getClosestPlayer(receivingTeam, ballX, ballY);
    const receiverMatePlayer = getOtherPlayer(receivingTeam, receivingPlayer.id);
    console.log("receivingPlayer ",receivingPlayer.id)
    let attackTouch = currentTeamTouches[currentTeamTouches.length-2].touch[currentTeamTouches[currentTeamTouches.length-2].touch.length-1];
    attackTouch.isFail = false;
    const isBallOnRightSide = ballX >= fieldConstants.width/2; // from UI perspective, the passer's side
    attackTouch.endingSide = isBallOnRightSide ? 0:1;
    if(!currentTouchArr.length) {
        currentTouchArr.push({
            player: receivingPlayer,
            ballX: ballX,
            ballY: ballY,

            stateName: 'pass', // 'service', 'pass', 'set', 'attack'
            //subStateName: string, // 'block', 'retouch afterblock', 'joust', spike, cut, pokie, rainbow, handset, bumpset, etc
            startingSide: attackTouch.endingSide, // 0 left, 1 right
            //endingSide: number, // 0 left, 1 right
            //fromAcross: boolean, // 0 no, 1 if ball comes from a diagonal angle
            //toAcross: boolean, // 0 no, 1 if ball comes from a diagonal angle
            //isScoring: boolean, // 0 no, 1 yes
            //isFail: boolean, // 0 no, 1 yes
            //playerExplicitMoves: object[], // array of player ids, X, Y, reason (block, drop, call, etc) when set by the User
            //setCall: string, // 'up', 'middle', 'antenna', 'back'
        });
    }
    let currentTouch = currentTouchArr[currentTouchArr.length-1];
    const firstServingTeam = game.points.filter(onePoint => onePoint.set === currentSet)[0].teamTouches[0].team;
    const currentServingTeam = currentPoint.teamTouches[0].team;
    const currentServingPlayer = currentPoint.teamTouches[0].touch[0].player;
    const lastAttackingTeam = currentTeamTouches[currentTeamTouches.length-2].team;
    const lastAttackingPlayer = attackTouch.player;
    const lastNotAttackingPlayer = getOtherPlayer(lastAttackingTeam, lastAttackingPlayer.id);
    const servingTeam : boolean = firstServingTeam.players[0].id !== currentServingPlayer.id; // true if the current serving team is not the first serving team

    // if team has a preferred blocker
    // or not the server (service)
    // or the attacker (attack)
    const blockerPlayer = lastAttackingTeam.prefersBlockId ? getPlayerById(lastAttackingTeam, lastAttackingTeam.prefersBlockId) :
                           attackTouch.stateName === 'service' ? lastNotAttackingPlayer: lastAttackingPlayer;

    const defenderPlayer =  getOtherPlayer(lastAttackingTeam, blockerPlayer.id);

    const isBallInUpperField = ballY < fieldConstants.height/2;// from UI perspective, upper screen side
    // isBallOnRightSide
    // serving/attacking team
    // blockerPlayer goes face the receiver, a bit in the center in case of option
    blockerPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(!isBallOnRightSide? fieldConstants.width - fieldConstants.blockingX :fieldConstants.blockingX),{ duration : 1000});
    blockerPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY((90*ballY+10*fieldConstants.height/2)/100),{ duration : 500});
    // defenderPlayer stays back in the center, a bit more in the diagonal?
    defenderPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(!isBallOnRightSide? fieldConstants.width - fieldConstants.serverBlockerMateX :fieldConstants.serverBlockerMateX),{ duration : 500});
    defenderPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(fieldConstants.height- (70*ballY+30*fieldConstants.height/2)/100),{ duration : 500});

    // receiving team
    // receivingPlayer behind the ball
    receivingPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(isBallOnRightSide ?ballX+fieldConstants.ballsize/2:ballX-fieldConstants.ballsize/2),{ duration : 500});
    receivingPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(ballY),{ duration : 500});
    //console.log("receiving player 2 ", receiverX, height - receiverY ,receiverY , height)
    // receiverMatePlayer goes to the center, 2 m from the receiver, closer to the net
    receiverMatePlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(isBallOnRightSide ? fieldConstants.width - fieldConstants.blockingX:fieldConstants.blockingX),{ duration : 500});
    receiverMatePlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(isBallInUpperField ? ballY+fieldConstants.height/5:ballY-fieldConstants.height/5),{ duration : 500});

    //ball
    game.ballX.value = withTiming(fieldConstants.validateBallX(ballX),{ duration : 50});
    game.ballY.value = withTiming(fieldConstants.validateBallY(ballY),{ duration : 50});
    savePlayerPositions(currentTouch, game.teams.flatMap(oneTeam => oneTeam.players));
}

export const renderSettingPosition = (ballX:number, ballY:number, game: Game, currentSet:number,  fieldConstants:FieldGraphicConstants) => {
    console.log("renderSettingPosition ("+game.points.length+")", "--------------------------------------")

    const currentPoint = game.points[game.points.length - 1];
    console.log("currentPoint ",currentPoint);

    const currentTeamTouches = currentPoint.teamTouches;
    console.log("currentTeamTouches ",currentTeamTouches);

    let currentTouchArr = currentTeamTouches[currentTeamTouches.length-1].touch;
    console.log("currentTouchArr ",currentTouchArr);

    const passingTeam = currentTeamTouches[currentTeamTouches.length-1].team ;
    console.log("passingTeam ",passingTeam.id);
    const passingPlayer = currentTouchArr[currentTouchArr.length-1].player;
    const settingPlayer = getOtherPlayer(passingTeam, passingPlayer.id);
    console.log("passingPlayer ",passingPlayer.id)
    console.log("settingPlayer ",settingPlayer.id)
    let passTouch = currentTouchArr[currentTouchArr.length-1];
    passTouch.isFail = false;
    const isBallOnRightSide = ballX >= fieldConstants.width/2; // from UI perspective, the passer's side
    passTouch.endingSide = isBallOnRightSide ? 0:1;
    currentTouchArr.push({
        player: settingPlayer,
        ballX: ballX,
        ballY: ballY,

        stateName: 'set', // 'service', 'pass', 'set', 'attack'
        //subStateName: string, // 'block', 'retouch afterblock', 'joust', spike, cut, pokie, rainbow, handset, bumpset, etc
        startingSide: passTouch.endingSide, // 0 left, 1 right
        //endingSide: number, // 0 left, 1 right
        //fromAcross: boolean, // 0 no, 1 if ball comes from a diagonal angle
        //toAcross: boolean, // 0 no, 1 if ball comes from a diagonal angle
        //isScoring: boolean, // 0 no, 1 yes
        //isFail: boolean, // 0 no, 1 yes
        //playerExplicitMoves: object[], // array of player ids, X, Y, reason (block, drop, call, etc) when set by the User
        //setCall: string, // 'up', 'middle', 'antenna', 'back'
    });
    let currentTouch = currentTouchArr[currentTouchArr.length-1];
    const firstServingTeam = game.points.filter(onePoint => onePoint.set === currentSet)[0].teamTouches[0].team;
    const currentServingTeam = currentPoint.teamTouches[0].team;
    const currentServingPlayer = currentPoint.teamTouches[0].touch[0].player;
    const lastAttackingTeam = currentTeamTouches[currentTeamTouches.length-2].team;
    let attackTouch = currentTeamTouches[currentTeamTouches.length-2].touch[currentTeamTouches[currentTeamTouches.length-2].touch.length-1];
    const lastAttackingPlayer = attackTouch.player;
    const lastNotAttackingPlayer = getOtherPlayer(lastAttackingTeam, lastAttackingPlayer.id);
    const servingTeam : boolean = firstServingTeam.players[0].id !== currentServingPlayer.id; // true if the current serving team is not the first serving team

    // if team has a preferred blocker
    // or not the server (service)
    // or the attacker (attack)
    const blockerPlayer = lastAttackingTeam.prefersBlockId ? getPlayerById(lastAttackingTeam, lastAttackingTeam.prefersBlockId) :
                           attackTouch.stateName === 'service' ? lastNotAttackingPlayer: lastAttackingPlayer;

    //const defenderPlayer =  getOtherPlayer(lastAttackingTeam, blockerPlayer.id);

    const isBallInUpperField = ballY < fieldConstants.height/2;// from UI perspective, upper screen side
    // isBallOnRightSide
    // defending team
    // blockerPlayer goes face the settet in case of option
    blockerPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(
        !isBallOnRightSide? fieldConstants.width - fieldConstants.blockingX :fieldConstants.blockingX
        ),{ duration : 1000});
    blockerPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(
        (90*ballY+10*fieldConstants.height/2)/100
        ),{ duration : 500});
    // defenderPlayer does not move?
    //defenderPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(!isBallOnRightSide? fieldConstants.width - fieldConstants.serverBlockerMateX :fieldConstants.serverBlockerMateX),{ duration : 500});
    //defenderPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(fieldConstants.height- (70*ballY+30*fieldConstants.height/2)/100),{ duration : 500});

    const isPassingPlayerAboveSetter = passingPlayer.playerY.value < settingPlayer.playerY.value; //higher in the UI
    // team now holding the ball
    // passingPlayer approaches
    passingPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(
        isBallOnRightSide ?fieldConstants.width - fieldConstants.approachX:fieldConstants.approachX
    ),{ duration : 500});
    passingPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(
        isPassingPlayerAboveSetter ? ballY-fieldConstants.height/6 : ballY+fieldConstants.height/6
    ),{ duration : 500});
    //console.log("receiving player 2 ", receiverX, height - receiverY ,receiverY , height)
    // settingPlayer behind the ball
    settingPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(
        ballX
    ),{ duration : 500});
    settingPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(
        isPassingPlayerAboveSetter ? ballY+fieldConstants.ballsize/2:ballY-fieldConstants.ballsize/2
    ),{ duration : 500});

    //ball
    game.ballX.value = withTiming(fieldConstants.validateBallX(ballX),{ duration : 50});
    game.ballY.value = withTiming(fieldConstants.validateBallY(ballY),{ duration : 50});
    savePlayerPositions(currentTouch, game.teams.flatMap(oneTeam => oneTeam.players));
}

export const renderAttackPosition = (ballX:number, ballY:number, game: Game, currentSet:number,  fieldConstants:FieldGraphicConstants) => {
    console.log("renderAttackPosition ("+game.points.length+")", "--------------------------------------")

    const currentPoint = game.points[game.points.length - 1];
    console.log("currentPoint ",currentPoint);

    const currentTeamTouches = currentPoint.teamTouches;
    console.log("currentTeamTouches ",currentTeamTouches);

    let currentTouchArr = currentTeamTouches[currentTeamTouches.length-1].touch;
    console.log("currentTouchArr ",currentTouchArr);

    const passingTeam = currentTeamTouches[currentTeamTouches.length-1].team ;
    console.log("passingTeam ",passingTeam.id);
    const settingPlayer = currentTouchArr[currentTouchArr.length-1].player;
    const attackingPlayer = getOtherPlayer(passingTeam, settingPlayer.id);
    console.log("settingPlayer ",settingPlayer.id)
    console.log("attackingPlayer ",attackingPlayer.id)
    let passTouch = currentTouchArr[currentTouchArr.length-1];
    passTouch.isFail = false;
    const isBallOnRightSide = ballX >= fieldConstants.width/2; // from UI perspective, the passer's side
    passTouch.endingSide = isBallOnRightSide ? 0:1;
    currentTouchArr.push({
        player: attackingPlayer,
        ballX: ballX,
        ballY: ballY,

        stateName: 'attack', // 'service', 'pass', 'set', 'attack'
        //subStateName: string, // 'block', 'retouch afterblock', 'joust', spike, cut, pokie, rainbow, handset, bumpset, etc
        startingSide: passTouch.endingSide, // 0 left, 1 right
        //endingSide: number, // 0 left, 1 right
        //fromAcross: boolean, // 0 no, 1 if ball comes from a diagonal angle
        //toAcross: boolean, // 0 no, 1 if ball comes from a diagonal angle
        //isScoring: boolean, // 0 no, 1 yes
        //isFail: boolean, // 0 no, 1 yes
        //playerExplicitMoves: object[], // array of player ids, X, Y, reason (block, drop, call, etc) when set by the User
        //setCall: string, // 'up', 'middle', 'antenna', 'back'
    });
    let currentTouch = currentTouchArr[currentTouchArr.length-1];
    const firstServingTeam = game.points.filter(onePoint => onePoint.set === currentSet)[0].teamTouches[0].team;
    const currentServingTeam = currentPoint.teamTouches[0].team;
    const currentServingPlayer = currentPoint.teamTouches[0].touch[0].player;
    const lastAttackingTeam = currentTeamTouches[currentTeamTouches.length-2].team;
    let attackTouch = currentTeamTouches[currentTeamTouches.length-2].touch[currentTeamTouches[currentTeamTouches.length-2].touch.length-1];
    const lastAttackingPlayer = attackTouch.player;
    const lastNotAttackingPlayer = getOtherPlayer(lastAttackingTeam, lastAttackingPlayer.id);
    const servingTeam : boolean = firstServingTeam.players[0].id !== currentServingPlayer.id; // true if the current serving team is not the first serving team

    // if team has a preferred blocker
    // or not the server (service)
    // or the attacker (attack)
    const blockerPlayer = lastAttackingTeam.prefersBlockId ? getPlayerById(lastAttackingTeam, lastAttackingTeam.prefersBlockId) :
                           attackTouch.stateName === 'service' ? lastNotAttackingPlayer: lastAttackingPlayer;

    const defenderPlayer =  getOtherPlayer(lastAttackingTeam, blockerPlayer.id);

    const isBallInUpperField = ballY < fieldConstants.height/2;// from UI perspective, upper screen side
    // isBallOnRightSide
    // defending team
    // blockerPlayer goes face the settet in case of option
    blockerPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(!isBallOnRightSide? fieldConstants.width - fieldConstants.blockingX :fieldConstants.blockingX),{ duration : 1000});
    blockerPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(ballY),{ duration : 500});
    // defenderPlayer does not move?
    defenderPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(!isBallOnRightSide? fieldConstants.width - fieldConstants.serverBlockerMateX :fieldConstants.serverBlockerMateX),{ duration : 500});
    defenderPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(fieldConstants.height- (90*ballY+10*fieldConstants.height/2)/100),{ duration : 500});

    // team now holding the ball
    // attackingPlayer is at the ball
    attackingPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(isBallOnRightSide ?ballX+fieldConstants.ballsize/2:ballX-fieldConstants.ballsize/2),{ duration : 500});
    attackingPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(ballY),{ duration : 500});
    //console.log("receiving player 2 ", receiverX, height - receiverY ,receiverY , height)
    // settingPlayer back to defending position or Blocker
    //settingPlayer.playerX.value = withTiming(fieldConstants.validatePlayerX(ballX),{ duration : 500});
    //settingPlayer.playerY.value = withTiming(fieldConstants.validatePlayerY(isBallInUpperField ? ballY+fieldConstants.ballsize/2:ballY-fieldConstants.ballsize/2),{ duration : 500});

    //ball
    game.ballX.value = withTiming(fieldConstants.validateBallX(ballX),{ duration : 50});
    game.ballY.value = withTiming(fieldConstants.validateBallY(ballY),{ duration : 50});
    savePlayerPositions(currentTouch, game.teams.flatMap(oneTeam => oneTeam.players));
}


