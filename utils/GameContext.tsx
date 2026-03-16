import React, { createContext, useContext, useState } from 'react';
import type { Game } from './BeachVolleyUtils';

interface GameContextType {
    game: Game | null;
    setGame: (game: Game | null) => void;
}

const GameContext = createContext<GameContextType>({
    game: null,
    setGame: () => {},
});

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
    const [game, setGame] = useState<Game | null>(null);
    return (
        <GameContext.Provider value={{ game, setGame }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGameContext = () => useContext(GameContext);

