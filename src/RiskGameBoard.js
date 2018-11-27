import React from 'react';
import { SvgImage } from './SvgImage';
import { worldMap } from './maps/worldmap';
import axios from 'axios';
import {AI_SERVER_REQUEST_URL} from './App';

export class RiskGameBoard extends React.Component {

  constructor(props) {
    super(props);
    this.state = {selectedCountry: null};
  }

  componentDidUpdate(){
    if (this.props.ctx.currentPlayer === "1")
      this.requestAIMove();
  }

  requestAIMove() {
    // check if the current player is an AI
    // if true, send a request to the AI server and simulate
    // the move returned by the AI server when the response is received

    // assumes player 1 is a greedy AI agent (for testing only)
    if (this.props.ctx.currentPlayer === "1") {
      console.log("true");
      // const integerCountries = {}
      // Object.keys(this.props.G).map(key => integerCountries[+key] = this.props.G[key])
      const data = {"G": this.props.G, "ctx": this.props.ctx, "agent": "passive", "adjacencyList": worldMap.adjacencyList};
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
      const move = moves[i];

      if (move.name === "attack") {
        const sourceId = move.sourceId;
        const destId = move.destId;

        this.props.moves.attack(sourceId, destId);
      } else if (move.name === "reinforce") {
        const sourceId = move.sourceId;
        const numSoldiers = move.numSoldiers[this.props.ctx.currentPlayer];
        this.props.moves.reinforceCountry(sourceId, numSoldiers);
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
        this.props.events.endTurn();
      } else {
        alert("can't occupy an already occuppied country");
      }
    } else if (this.props.ctx.phase === 'Reinforce Countries') {
      if (this._canReinforce(id)) {
        this.props.moves.reinforceCountry(id, 1);
        this.props.events.endTurn();
      } else {
        alert("can't reinforce a country you don't occupy");
      }
    } else if (this.props.ctx.phase === 'War') {
      if (this.state.selectedCountry) {
        if(this._canAttack(this.state.selectedCountry, id)) {
          // perform attack
          this.props.moves.attack(this.props.selectedCountry, id);
          this.props.events.endTurn();
          this.setState({...this.state, selectedCountry: null});
        } else {
          alert("you can't attack " + worldMap.countryName[id])
        }
      } else {
        // check if valid selection first
        if (this.props.G.countries[id].owner === this.props.ctx.currentPlayer)
          this.setState({...this.state, selectedCountry: id})
        else {
          alert("you can't attack with " + worldMap.countryName[id] + ". You don't own this country.");
        }
      }
    }
  }

  _canAttack(sourceId, destId) {
    const isNeighbor = worldMap.adjacencyList[sourceId].indexOf(+destId) > -1;
    const isEnemy = this.props.G.countries[sourceId].owner !== this.props.G.countries[destId].owner;
    return isNeighbor && isEnemy;
  }

  // returns neighbouring enemy countries
  _getDefendingCountries(attackingCountry) {
    if(!attackingCountry)
      return [];

    const currPlayer = this.props.ctx.currentPlayer;
    const neighbors = worldMap.adjacencyList[attackingCountry];
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
      <div style={{margin: "20px 20px 20px 20px"}}>
        <SvgImage countries={this.props.G.countries} attackingCountry={this.state.selectedCountry}
        defendingCountries={this._getDefendingCountries(this.state.selectedCountry)} map={worldMap}
        names={worldMap.countryName} onClick={(i) => this.handleClick(i)}/>
      </div>
    );
  }
};

export function playerTerritoryColor(playerNum) {
  switch(playerNum) {
    case "0": return "red";
    case "1": return "blue";
    case "2": return "yellow";
    default: return "rgb(200,200,200)";
  }
};

export const AttackingStateEnum = Object.freeze({"normal":1, "attacking":2, "being_attacked":3});
