import React, { createContext, useContext, useState } from 'react';
import type { Game, Score, TouchIndex } from './types';

interface GameContextType {
  game: Game | null;
  setGame: (g: Game | null) => void;
  score: Score;
  setScore: (s: Score) => void;
  currentIdx: TouchIndex;
  setCurrentIdx: (i: TouchIndex) => void;
}

const defaultIdx: TouchIndex = { pointIdx: 0, rallyIdx: 0, touchIdx: 0 };
const defaultScore: Score = { scoreTeam: [0, 0], setsTeam: [0, 0] };

const GameContext = createContext<GameContextType>({
  game: null, setGame: () => {},
  score: defaultScore, setScore: () => {},
  currentIdx: defaultIdx, setCurrentIdx: () => {},
});

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [game, setGame] = useState<Game | null>(null);
  const [score, setScore] = useState<Score>(defaultScore);
  const [currentIdx, setCurrentIdx] = useState<TouchIndex>(defaultIdx);
  return (
    <GameContext.Provider value={{ game, setGame, score, setScore, currentIdx, setCurrentIdx }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => useContext(GameContext);
