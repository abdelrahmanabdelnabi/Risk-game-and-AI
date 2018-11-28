import React from 'react';
import { SvgImage } from './SvgImage';
import { worldMap } from './maps/worldmap';
import axios from 'axios';
import {AI_SERVER_REQUEST_URL} from './App';
import './RiskGameBoard.css';
import './dice.css'
import './soldiersNumbers.css';

export class RiskGameBoard extends React.Component {

  constructor(props) {
    super(props);
    this.state = {selectedCountry: null};
  }

  requestAIMove() {
    // check if the current player is an AI
    // if true, send a request to the AI server and simulate
    // the move returned by the AI server when the response is received

    // assumes player 1 is a greedy AI agent (for testing only)
    if (this.props.ctx.currentPlayer === "0") {
      // const integerCountries = {}
      // Object.keys(this.props.G).map(key => integerCountries[+key] = this.props.G[key])
      const data = {"G": this.props.G, "ctx": this.props.ctx, "agent": "passive", "adjacencyList": worldMap.adjacencyList};
      data.ctx.currentPlayer = "1";
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
          alert("you can't reinforce " + worldMap.countryName[id] + ". You don't own this country.");
        }

      } else if (this.state.selectedCountry) {
        if(this._canAttack(this.state.selectedCountry, id)) {
          // perform attack
          this.props.moves.attack(this.state.selectedCountry, id);
          this.endCurrentPlayerTurn();
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

  endCurrentPlayerTurn() {
    this.props.events.endTurn();
    if(this.props.ctx.currentPlayer === "0") {
      this.requestAIMove();
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
      <ul className="flex-container center">
        <li>
          <div style={{margin: "20px 20px 20px 20px"}}>
            <SvgImage countries={this.props.G.countries} attackingCountry={this.state.selectedCountry}
            defendingCountries={this._getDefendingCountries(this.state.selectedCountry)} map={worldMap}
            names={worldMap.countryName} onClick={(i) => this.handleClick(i)}/>
            <div id="ArmiesLayer_27" className="ujsSprite">
              <div className="ujsTerritoryText" style={{left: "300px", top: "95px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['3']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "130px", top: "138px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['1']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "45px", top: "135px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['43']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "120px", top: "170px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['4']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "165px", top: "170px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['5']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "230px", top: "175px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['6']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "135px", top: "210px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['7']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "190px", top: "220px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['8']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "160px", top: "258px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['9']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "230px", top: "295px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['10']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "275px", top: "330px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['11']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "235px", top: "340px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['12']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "245px", top: "385px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['13']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "352px", top: "135px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['14']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "430px", top: "135px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['15']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "389px", top: "172px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['16']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "425px", top: "178px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['17']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "398px", top: "195px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['18']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "445px", top: "200px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['19']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "480px", top: "170px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['20']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "395px", top: "265px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['21']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "445px", top: "248px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['22']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "475px", top: "290px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['23']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "445px", top: "310px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['24']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "450px", top: "360px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['25']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "499px", top: "355px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['26']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "550px", top: "150px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['27']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "610px", top: "135px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['28']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "675px", top: "130px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['29']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "750px", top: "130px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['30']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "545px", top: "195px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['31']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "650px", top: "170px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['32']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "672px", top: "195px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['33']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "711px", top: "221px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['34']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "490px", top: "235px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['35']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "570px", top: "250px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['36']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "620px", top: "225px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['37']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "625px", top: "270px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['38']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "652px", top: "310px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['39']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "717px", top: "320px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['40']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "682px", top: "365px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['41']['soldiers']}
              </div>
              <div className="ujsTerritoryText" style={{left: "725px", top: "370px", color: "rgb(0, 0, 0)"}}>
                {this.props.G.countries['42']['soldiers']}
              </div>
            </div>
          </div>
          <div>
            <ul className="legend">
              <li><span className="player0"></span> Player 0</li>
              <li><span className="player1"></span> Player 1</li>
          </ul>
          </div>
        </li>
        <li>
          <div style={{margin: "20px 20px 20px 20px"}}>
            <h3>Current Player: {this.props.ctx.currentPlayer}</h3>
            <h3>Unassigned Units: {this.props.G.unassignedUnits[this.props.ctx.currentPlayer]}</h3>
            <h3>Current Phase: {this.props.ctx.phase}</h3>
            {this.props.ctx.phase === 'War' &&
              <h3>Selected Country: {worldMap.countryName[this.state.selectedCountry]}</h3>
            }
            <span className="dice dice-3" title="Dice 1"></span>
            <span className="dice dice-6" title="Dice 2"></span>
            <span className="dice dice-4" title="Dice 3"></span>
          </div>
        </li>
      </ul>
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
