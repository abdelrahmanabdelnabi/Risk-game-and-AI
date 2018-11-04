import { Game } from 'boardgame.io/core';
import { Client } from 'boardgame.io/react';
import { RiskGameBoard } from './RiskGameBoard';


// Return true if `countries` is in a winning configuration.
function IsVictory(countries) {
  return false;  
}

const RiskGame = Game({
  setup: () => ({
    countries: Array(9).fill({owner: null, soldiers: 0}),
    unassignedUnits: {0: 10, 1: 10}
 }),

  moves: {
    occupyCountry(G, ctx, id) {
      const countries = [ ...G.countries ];
      const unassignedUnits = {...G.unassignedUnits};


      // Ensure we can't overwrite countries.
      if (countries[id].owner === null && unassignedUnits[ctx.currentPlayer] > 0) {
        countries[id] = { owner: ctx.currentPlayer, soldiers: 1};
        unassignedUnits[ctx.currentPlayer]--;
      }

      return { ...G, countries, unassignedUnits };
    },

    reinforceCountry(G, ctx, id) {
      const countries = [ ...G.countries ];
      const unassignedUnits = {...G.unassignedUnits};

      // Ensure we can't overwrite countries.
      if (countries[id].owner === ctx.currentPlayer && unassignedUnits[ctx.currentPlayer] > 0) {
        countries[id].soldiers += 1;
        unassignedUnits[ctx.currentPlayer]--;
      }

      return { ...G, countries, unassignedUnits };
    },

    attack(G, ctx, sourceId, destId) {

    }
  },

  flow: {
    endGameIf: (G, ctx) => {
      if (IsVictory(G.countries)) {
        return { winner: ctx.currentPlayer };
      }
    },

    phases: [
      {
        name: "Occupation",
        allowedMoves: ['occupyCountry'],
        endPhaseIf: (G, ctx) => G.countries.filter((c) => c.owner === null).length === 0,
      },

      {
        name: "Reinforce Countries",
        allowedMoves: ['reinforceCountry'],
        onPhaseBegin: (G, ctx) => {ctx.playOrderPos = 0; return G},

        // end phase if the total number of unassigned units is zero
        endPhaseIf: (G, ctx) => Object.keys(G.unassignedUnits).reduce((total, key) => total + +G.unassignedUnits[key], 0) === 0
      },

      {
        name: "war",
        allowedMoves: ['attack']
      }
    ]
  },
});
const App = Client({ game: RiskGame, board: RiskGameBoard });

export default App;