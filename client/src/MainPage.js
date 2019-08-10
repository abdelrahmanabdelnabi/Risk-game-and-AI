import React from 'react';
import { createGame } from './Game';
import { Client } from 'boardgame.io/react';
import { GameOptionsPage } from './GameOptionsPage';
import { BoardWithOptions } from './RiskGameBoard';

export class MainPage extends React.Component {

  constructor(props) {
      super(props);
      this.state = {gameStarted: false, options: null};
  }

  render () {
    if (!this.state.gameStarted) {
      return (
        <GameOptionsPage onOptionsSubmit={(options) => this.handleOptionsSubmit(options)}/>
      );
    }
    else {
      const riskGame = createGame(this.state.options);
      const NewGame = Client({ game: riskGame, board: BoardWithOptions(this.state.options) })
      return (
        <NewGame />
      );
    }
  }

  handleOptionsSubmit(gameOptions) {
    this.setState({...this.state, gameStarted: true, options: gameOptions})
  }
};