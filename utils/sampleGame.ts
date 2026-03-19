import type { Game } from './types';

export const sampleGame: Game = {
  title: 'Olympics 2024 round of 16 FIN vs BRA',
  teams: [
    { id: 'Finland', playerIds: ['Niina', 'Taru'], prefersBlockId: 'Taru' },
    { id: 'Brazil', playerIds: ['AnaPatricia', 'Duda'], prefersBlockId: null },
  ],
  players: [
    { id: 'Niina' }, { id: 'Taru' }, { id: 'AnaPatricia' }, { id: 'Duda' },
  ],
  points: [
    {
      set: 0,
      wonByTeamId: 'Finland',
      rallies: [
        {
          teamId: 'Finland',
          touches: [
            { playerId: 'Niina', ballX: 36, ballY: 57, type: 'serve', explicitPositions: [], calculatedPositions: [{ id: 'Niina', x: 0, y: 57 }, { id: 'Taru', x: 234, y: 149 }, { id: 'AnaPatricia', x: 581, y: 57 }, { id: 'Duda', x: 581, y: 242 }], startingSide: 1 },
          ],
        },
        {
          teamId: 'Brazil',
          touches: [
            { playerId: 'Duda', ballX: 556, ballY: 227, type: 'pass', explicitPositions: [], calculatedPositions: [{ id: 'Taru', x: 234, y: 219 }, { id: 'Niina', x: 67, y: 94 }, { id: 'Duda', x: 592, y: 227 }, { id: 'AnaPatricia', x: 414, y: 153 }], startingSide: 0 },
            { playerId: 'AnaPatricia', ballX: 413, ballY: 139, type: 'set', explicitPositions: [], calculatedPositions: [{ id: 'Taru', x: 234, y: 140 }, { id: 'Niina', x: 67, y: 94 }, { id: 'Duda', x: 444, y: 201 }, { id: 'AnaPatricia', x: 413, y: 103 }], startingSide: 0 },
            { playerId: 'Duda', ballX: 398, ballY: 220, type: 'attack', explicitPositions: [], calculatedPositions: [{ id: 'Taru', x: 234, y: 220 }, { id: 'Niina', x: 67, y: 85 }, { id: 'Duda', x: 434, y: 220 }, { id: 'AnaPatricia', x: 413, y: 103 }], startingSide: 0 },
          ],
        },
        {
          teamId: 'Finland',
          touches: [
            { playerId: 'Niina', ballX: 85, ballY: 63, type: 'pass', explicitPositions: [], calculatedPositions: [{ id: 'Duda', x: 414, y: 72 }, { id: 'AnaPatricia', x: 581, y: 209 }, { id: 'Niina', x: 49, y: 63 }, { id: 'Taru', x: 234, y: 137 }], startingSide: 1, isScoring: true },
          ],
        },
      ],
    },
    {
      set: 0,
      wonByTeamId: 'Finland',
      rallies: [
        {
          teamId: 'Finland',
          touches: [
            { playerId: 'Niina', ballX: 36, ballY: 57, type: 'serve', explicitPositions: [], calculatedPositions: [{ id: 'Niina', x: 0, y: 57 }, { id: 'Taru', x: 234, y: 149 }, { id: 'AnaPatricia', x: 581, y: 57 }, { id: 'Duda', x: 581, y: 242 }], startingSide: 1, isScoring: true },
          ],
        },
        {
          teamId: 'Brazil',
          touches: [
            { playerId: 'Duda', ballX: 543, ballY: 238, type: 'pass', explicitPositions: [], calculatedPositions: [{ id: 'Taru', x: 234, y: 229 }, { id: 'Niina', x: 67, y: 87 }, { id: 'Duda', x: 579, y: 238 }, { id: 'AnaPatricia', x: 414, y: 164 }], startingSide: 0, isFail: true },
          ],
        },
      ],
    },
  ],
};
