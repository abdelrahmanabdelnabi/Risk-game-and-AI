import { Game } from 'boardgame.io/core';
import { Client } from 'boardgame.io/react';
import { BoardWithOptions } from './RiskGameBoard';
import { worldMap } from './maps/worldmap';

// Return true if `countries` is in a winning configuration.
function IsVictory(countries) {
  // TODO
  return false;
}

const gameOptions = {
  gameMap: worldMap,
  players: ["human", "greedy"],
  unitsPerPlayer: 25,
  useDice: false
};

const numPlayers = gameOptions.players.length;

const RiskGame = Game({
  setup: () => {

    const countries = {};
    Object.keys(gameOptions.gameMap.countryName).map((key) => countries[key] = {owner: null, soldiers: 0});
    const unassignedUnits = {};

    for(var i = 0; i < numPlayers; i++)
      unassignedUnits[i] = gameOptions.unitsPerPlayer;

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

    reinforceCountry(G, ctx, id, numSoldiers) {
      const countries = {...G.countries};
      const unassignedUnits = {...G.unassignedUnits};

      // Ensure we can't overwrite countries.
      if (countries[id].owner === ctx.currentPlayer && +unassignedUnits[ctx.currentPlayer] >= +numSoldiers) {
        countries[id].soldiers += +numSoldiers;
        unassignedUnits[ctx.currentPlayer] -= +numSoldiers;
      }

      return { ...G, countries, unassignedUnits };
    },

    attack(G, ctx, sourceId, destId) {
      // TODO
      // assuming the board component validates the attack move

      const countries = {...G.countries};

      if(gameOptions.useDice) {

      } else {
        // make sure the attacking country has more soldiers than the defending country by at least 2.
        const diff = G.countries[sourceId].soldiers - G.countries[destId].soldiers;
        if ( diff >= 2) {
          // subtract the number of soldiers of the defending country from the attacking country,
          // and move all but one of the soldiers of the attacking country to the defeated country.
          countries[sourceId].soldiers = 1;
          countries[destId].soldiers = diff - 1;
          countries[destId].owner = countries[sourceId].owner;
          return {...G, countries};
        }
      }
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
        name: "War",
        allowedMoves: ['attack', 'reinforceCountry'],

        // give the current player his new units on the beginning of each turn
        onTurnBegin: (G, ctx) => {
          var currentPlayer = ctx.currentPlayer;

          var numOwnedCountries =
          Object.keys(G.countries)
          .reduce((count, key) => count + (G.countries[key].owner === currentPlayer ? 1 : 0), 0);

          const unassignedUnits = {...G.unassignedUnits};
          unassignedUnits[currentPlayer] += Math.max(Math.floor(numOwnedCountries / 3), 3);
          return {...G, unassignedUnits}
        }
      }
    ]
  },
});

const App = Client({ game: RiskGame, board: BoardWithOptions(gameOptions), gameOptions: gameOptions });

export default App;
export const AI_SERVER_REQUEST_URL = "http://localhost:5000/solve";