import React from 'react';
import { SvgImage } from './SvgImage';

export class RiskGameBoard extends React.Component {
  onClick(id) {
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
    }
  }

  _canReinforce(id) {
    return this.props.G.countries[id].owner === this.props.ctx.currentPlayer;
  }

  _canOccupy(id) {
    return this.props.G.countries[id].owner === null;
  }

  playerBgColor(playerNum) {
    switch(playerNum) {
      case "0": return "red";
      case "1": return "blue";
      default: return "transparent";
    }
  }

  render() {
    let winner = '';
    if (this.props.ctx.gameover) {
      winner =
        this.props.ctx.gameover.winner !== undefined ? (
          <div id="winner">Winner: {this.props.ctx.gameover.winner}</div>
        ) : (
          <div id="winner">Draw!</div>
        );
    }

    const cellStyle = {
      border: '1px solid #555',
      width: '50px',
      height: '50px',
      lineHeight: '50px',
      textAlign: 'center',
    };

    let tbody = [];
    for (let i = 0; i < 3; i++) {
      let cells = [];
      for (let j = 0; j < 3; j++) {
        const id = 3 * i + j;
        cells.push(
          <td style={{...cellStyle, "backgroundColor":this.playerBgColor(this.props.G.countries[id].owner)}} key={id} onClick={() => this.onClick(id)}>
            {this.props.G.countries[id].soldiers}
          </td>
        );
      }
      tbody.push(<tr key={i}>{cells}</tr>);
    }

    return (
      <div>
        <table id="board">
          <tbody>{tbody}</tbody>
        </table>
        {winner}
        <SvgImage path={'logo.svg'}/>
      </div>
    );
  }
};

