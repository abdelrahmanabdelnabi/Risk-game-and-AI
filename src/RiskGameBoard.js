import React from 'react';
import { SvgImage } from './SvgImage';
import { worldMap } from './maps/worldmap';

export class RiskGameBoard extends React.Component {

  constructor(props) {
    super(props);
    this.state = {selectedCountry: null};
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
        this.props.moves.reinforceCountry(id);
        this.props.events.endTurn();
      } else {
        alert("can't reinforce a country you don't occupy");
      }
    } else if (this.props.ctx.phase === 'War') {
      if (this.state.selectedCountry) {
        // perform attack
        // this.props.moves.attack(this.props.selectedCountry, id);
        this.props.events.endTurn();
        this.setState({...this.state, selectedCountry: null});
      } else {
        // check if valid selection first
        this.setState({...this.state, selectedCountry: id})
      }
    }
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
