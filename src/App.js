import { Game } from 'boardgame.io/core';
import { Client } from 'boardgame.io/react';
import { RiskGameBoard } from './RiskGameBoard';
import { worldMap } from './maps/worldmap';

// Return true if `countries` is in a winning configuration.
function IsVictory(countries) {
  // TODO
  return false;  
}

const gameMap = worldMap;
const numPlayers = 3;
const unitsPerPlayer = 20

const RiskGame = Game({
  setup: () => {

    const countries = {};
    Object.keys(gameMap.countryName).map((key) => countries[key] = {owner: null, soldiers: 0});
    const unassignedUnits = {};

    for(var i = 0; i < numPlayers; i++)
      unassignedUnits[i] = unitsPerPlayer;

    return {
      countries: countries,
      unassignedUnits: unassignedUnits
    }
  },

  moves: {
    occupyCountry(G, ctx, id) {
      const countries = {...G.countries};
      const unassignedUnits = {...G.unassignedUnits};

      // Ensure we can't overwrite countries.
      if (countries[id].owner === null && unassignedUnits[ctx.currentPlayer] > 0) {
        countries[id] = { owner: ctx.currentPlayer, soldiers: 1};
        unassignedUnits[ctx.currentPlayer]--;
      }

      return { ...G, countries, unassignedUnits };
    },

    reinforceCountry(G, ctx, id) {
      const countries = {...G.countries};
      const unassignedUnits = {...G.unassignedUnits};

      // Ensure we can't overwrite countries.
      if (countries[id].owner === ctx.currentPlayer && unassignedUnits[ctx.currentPlayer] > 0) {
        countries[id].soldiers += 1;
        unassignedUnits[ctx.currentPlayer]--;
      }

      return { ...G, countries, unassignedUnits };
    },

    attack(G, ctx, sourceId, destId) {
      // TODO
    }
  },

  flow: {
    endGameIf: (G, ctx) => {
      if (IsVictory(G.countries)) {
        return { winner: ctx.currentPlayer };
      }
    },

    turnOrder: {
      // a custom turn order to reset the playOrderPos on the start of each phase
      // boardgame.io seems to always get the next player after the one returned by first,
      // so this is a hack to solve this issue
      first: () => numPlayers - 1,
      next: (G, ctx) => (ctx.playOrderPos + 1) % ctx.numPlayers,
    },

    phases: [
      {
        name: "Occupation",
        allowedMoves: ['occupyCountry'],
        turnOrder: {
          first: () => 0,
          next: (G, ctx) => (ctx.playOrderPos + 1) % ctx.numPlayers,
        },
        
        // end phase if there are no more countries with owner = null
        endPhaseIf: (G, ctx) => Object.keys(G.countries).filter((key) => G.countries[key].owner === null).length === 0,
      },

      {
        name: "Reinforce Countries",
        allowedMoves: ['reinforceCountry'],
        // end phase if the total number of unassigned units is zero
        endPhaseIf: (G, ctx) => Object.keys(G.unassignedUnits).reduce((total, key) => total + +G.unassignedUnits[key], 0) === 0
      },

      {     
        name: "war",
        allowedMoves: ['attack'],
      }
    ]
  },
});


const App = Client({ game: RiskGame, board: RiskGameBoard, numPlayers: numPlayers });

export default App;