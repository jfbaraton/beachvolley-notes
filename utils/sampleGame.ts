import type { Game } from './types';
import defaultGameData from './Olympics_2024_round_of_16_FIN_vs_BRA.json';
import newGameData from './defaultGame.json';

export const sampleGame: Game = defaultGameData as unknown as Game;
export const newGame: Game = newGameData as unknown as Game;
