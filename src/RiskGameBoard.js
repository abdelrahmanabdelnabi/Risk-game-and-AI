import React from 'react';
import { SvgImage } from './SvgImage';
import { worldMap } from './maps/worldmap';
import { usMap } from './maps/usmap';
import axios from 'axios';
import {AI_SERVER_REQUEST_URL} from './App';
import './RiskGameBoard.css';
import './dice.css'
import './soldiersNumbers.css';

export function BoardWithOptions(gameOptions) {
  const mapName = gameOptions.gameMap;
  let gameMap = {};
  switch (mapName) {
    case 'World':
      gameMap = worldMap;
      break;
    case 'USA':
      gameMap = usMap;
      break;
    default: gameMap = worldMap;
  }

  return class RiskGameBoard extends React.Component {

    constructor(props) {
      super(props);
      this.state = {selectedCountry: null};
    }

    componentDidMount() {
      this.turnStartHandler();
    }

    componentDidUpdate(prevProps) {
      if(this.props.ctx.currentPlayer === prevProps.ctx.currentPlayer)
        return;
      else {
        this.turnStartHandler();
      }
    }

    turnStartHandler() {
      // check if current player is AI, if so send request to AI server
      const currentPlayer = gameOptions.players[+this.props.ctx.currentPlayer];
      if(currentPlayer.isAI) {
        this.requestAIMove();
      }
    }

    requestAIMove() {
      // check if the current player is an AI
      // if true, send a request to the AI server and simulate
      // the move returned by the AI server when the response is received

      const currentPlayer = gameOptions.players[+this.props.ctx.currentPlayer];
      if (currentPlayer.isAI) {
        const data = {"G": this.props.G, "ctx": this.props.ctx, "agent": currentPlayer.name, "adjacencyList": gameMap.adjacencyList};
        axios({
          url: `${AI_SERVER_REQUEST_URL}`,
          method: "post",
          mode: 'no-cors',
          data: JSON.stringify(data),
          credentials: 'same-origin',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        })
        .then(response => {
            this.handleAIMovesResponse(response);
        })
        .catch(error => alert(error))
      }
    }

    handleAIMovesResponse(response) {
      if (response.status !== 200) {
        alert("Error in AI server, response code: " + response.status + ". Response text: " + response.statusText);
        console.log(response.data);
      }
      const json = JSON.parse(response.data);
      var moves = json['moves'];
      console.log(moves);
      this.simulateAIMoves(moves);
    }

    simulateAIMoves(moves) {
      if(!moves)
        return;

      for(var i = 0; i < moves.length; i++) {
        let move = moves[i];

        if (move.name === "attack") {
          let sourceId = move.sourceId;
          let destId = move.destId;
          this.props.moves.attack(sourceId, destId);
        } else if (move.name === "reinforce") {
          let sourceId = move.sourceId;
          let numSoldiers = move.numSoldiers;
          this.props.moves.reinforceCountry(sourceId, numSoldiers);
        } else if (move.name === "occupy") {
          let sourceId = move.sourceId;
          this.props.moves.occupyCountry(sourceId);
        } else if (move.name === "fortify") {
          // not yet implemented
        }
      }
      this.props.events.endTurn();
    }

    // This handler gets called whenever a territory is clicked
    handleClick(territoryId) {
      const id = territoryId.split("_")[1];
      const type = territoryId.split("_")[0];

      if(type !== 'Territory')
        return;
      if (this.props.ctx.phase === 'Occupation') {
        if (this._canOccupy(id)) {
          this.props.moves.occupyCountry(id);
          this.endCurrentPlayerTurn();
        } else {
          alert("can't occupy an already occuppied country");
        }
      } else if (this.props.ctx.phase === 'Reinforce Countries') {
        if (this._canReinforce(id)) {
          this.props.moves.reinforceCountry(id, 1);
          this.endCurrentPlayerTurn();
        } else {
          alert("can't reinforce a country you don't occupy");
        }
      } else if (this.props.ctx.phase === 'War') {

        // if the player has unassigned units, make his assign them first
        if (this.props.G.unassignedUnits[this.props.ctx.currentPlayer] > 0) {
          if(this._canReinforce(id)) {
            this.props.moves.reinforceCountry(id, 1);
          } else {
            alert("you can't reinforce " + gameMap.countryName[id] + ". You don't own this country.");
          }

        } else if (this.state.selectedCountry) {
          if (this.state.selectedCountry === id)
            this.setState({...this.state, selectedCountry: null});
          else if(this._canAttack(this.state.selectedCountry, id)) {
            // perform attack
            this.props.moves.attack(this.state.selectedCountry, id);
            this.setState({...this.state, selectedCountry: null});
          } else {
            alert("you can't attack " + gameMap.countryName[id])
          }
        } else {
          // check if valid selection first
          if (this.props.G.countries[id].owner === this.props.ctx.currentPlayer)
            this.setState({...this.state, selectedCountry: id})
          else {
            alert("you can't attack with " + gameMap.countryName[id] + ". You don't own this country.");
          }
        }
      }
    }

    endTurnHandler() {
      this.setState({...this.state, selectedCountry: null});
      this.endCurrentPlayerTurn();
    }

    endCurrentPlayerTurn() {
      this.props.events.endTurn();
    }

    _canAttack(sourceId, destId) {
      const isNeighbor = gameMap.adjacencyList[sourceId].indexOf(+destId) > -1;
      const isEnemy = this.props.G.countries[sourceId].owner !== this.props.G.countries[destId].owner;
      return isNeighbor && isEnemy;
    }

    // returns neighbouring enemy countries
    _getDefendingCountries(attackingCountry) {
      if(!attackingCountry)
        return [];

      const currPlayer = this.props.ctx.currentPlayer;
      const neighbors = gameMap.adjacencyList[attackingCountry];
      return neighbors.filter(neighbor => this.props.G.countries[neighbor].owner !== currPlayer);
    }

    // returns true if current player can reinforce the country with the specified id
    _canReinforce(id) {
      return this.props.G.countries[id].owner === this.props.ctx.currentPlayer;
    }

    // returns true if current player can occupy the country with the specified id
    _canOccupy(id) {
      return this.props.G.countries[id].owner === null;
    }

  render() {
    return (
      <ul className="flex-container center">
        <li>
          <div style={{margin: "20px 20px 20px 20px"}}>
            <SvgImage countries={this.props.G.countries} attackingCountry={this.state.selectedCountry}
            defendingCountries={this._getDefendingCountries(this.state.selectedCountry)} map={gameMap}
            onClick={(i) => this.handleClick(i)}/>
          </div>
          <div>
            <ul className="legend">
              <li><span className="player0"></span> {gameOptions.players[0].name}</li>
              <li><span className="player1"></span> {gameOptions.players[1].name}</li>
          </ul>
          </div>
        </li>
        <li>
          <div style={{margin: "20px 20px 20px 20px"}}>
            <h3>Current Player: {this.props.ctx.currentPlayer}</h3>
            {
              this.props.G.unassignedUnits[this.props.ctx.currentPlayer] > 0 &&
              <h3>Assign your units!</h3>
            }
            <h3>Unassigned Units: {this.props.G.unassignedUnits[this.props.ctx.currentPlayer]}</h3>
            <h3>Current Phase: {this.props.ctx.phase}</h3>
            {
              this.props.ctx.phase === 'War' &&
              <h3>Selected Country: {gameMap.countryName[this.state.selectedCountry]}</h3>
            }

              {
                this.props.ctx.phase === 'War' && this.props.G.unassignedUnits[this.props.ctx.currentPlayer] === 0 &&
                <a href="#" onClick={() => this.endTurnHandler()} class="square_btn">END TURN</a>
              }
            </div>
          </li>
        </ul>
      );
    }
  };
}

export function playerTerritoryColor(playerNum) {
  switch(playerNum) {
    case "0": return "red";
    case "1": return "blue";
    case "2": return "yellow";
    default: return "rgb(200,200,200)";
  }
};

export const AttackingStateEnum = Object.freeze({"normal":1, "attacking":2, "being_attacked":3});
