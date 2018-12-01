import React from 'react';
import SelectList from 'react-widgets/lib/SelectList';
import Combobox from 'react-widgets/lib/Combobox';
import 'react-widgets/dist/css/react-widgets.css';
import './GameOptionsPage.css';

export class GameOptionsPage extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      gameMode: 'playing',
      players: ['human', 'passive'],
      startWithRandomCountries: false,
      useDice: false
    };
    this.handleModeChange = this.handleModeChange.bind(this);
    this.handleFirstPlayerChange = this.handleFirstPlayerChange.bind(this);
    this.handleSecondPlayerChange = this.handleSecondPlayerChange.bind(this);
    this.handleRandomOccupationCheck = this.handleRandomOccupationCheck.bind(this);
    this.handleDiceCheck = this.handleDiceCheck.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
  }

  handleModeChange(mode) {
    if (mode.value === 'simulation') {
      this.setState({...this.state, players: ['passive', 'aggresive'], gameMode: mode.value});
    } else {
      this.setState({...this.state, players: ['human', 'passive'], gameMode: mode.value});
    }
  }

  handleFirstPlayerChange(player) {
    this.setState({...this.state, players: [player.value, this.state.players[1]]});
  }

  handleSecondPlayerChange(player) {
    this.setState({...this.state, players: [this.state.players[0], player.value]});
  }

  handleRandomOccupationCheck() {
    this.setState({...this.state, startWithRandomCountries: !this.state.startWithRandomCountries});
  }

  handleDiceCheck() {
    this.setState({...this.state, useDice: !this.state.useDice});
  }

  handleFormSubmit(formSubmitEvent) {
    formSubmitEvent.preventDefault();
    console.log('LET THE GAME BEGIN');
  }

  render() {
    let gameModes = ['playing', 'simulation'];
    let players = [
      'human',
      'passive',
      'aggresive',
      'pacifist',
      'greedy',
      'a*',
      'real-time-a*',
      'minimax'
    ];
    return (
      <fieldset className="game-options">
        <legend>Game Options</legend>
          <form onSubmit={this.handleFormSubmit} style={{margin:"10px"}}>
            <ul className="flex-container center">
              <li>
                <div style={{"margin":"10px"}}>
                  <ul className="flex-container center">
                    <li>
                      <div>
                        <span>Game Mode:</span>
                      </div>
                    </li>
                    <li>
                      <SelectList
                        className="option-field"
                        data={gameModes}
                        value={this.state.gameMode}
                        onChange={value => this.handleModeChange({value})}
                      />
                    </li>
                  </ul>
                </div>
                <div style={{"margin":"10px"}}>
                  <ul className="flex-container center">
                    <li>
                      <div>
                        <span>Player 1:</span>
                      </div>
                    </li>
                    <li>
                    {
                      this.state.gameMode === 'playing' &&
                      <Combobox
                        disabled
                        className="option-field"
                        data={players}
                        value={this.state.players[0]}
                        onChange={value => this.handleFirstPlayerChange({value})}
                      />
                    }
                    {
                      this.state.gameMode === 'simulation' &&
                      <Combobox
                        disabled={['human']}
                        className="option-field"
                        data={players}
                        value={this.state.players[0]}
                        onChange={value => this.handleFirstPlayerChange({value})}
                      />
                    }
                    </li>
                  </ul>
                </div>
                <div style={{"margin":"10px"}}>
                  <ul className="flex-container center">
                    <li>
                      <div>
                        <span>Player 2:</span>
                      </div>
                    </li>
                    <li>
                    {
                      this.state.gameMode === 'playing' &&
                      <Combobox
                        className="option-field"
                        data={players}
                        value={this.state.players[1]}
                        onChange={value => this.handleSecondPlayerChange({value})}
                      />
                    }
                      {
                        this.state.gameMode === 'simulation' &&
                        <Combobox
                          disabled={['human']}
                          className="option-field"
                          data={players}
                          value={this.state.players[1]}
                          onChange={value => this.handleSecondPlayerChange({value})}
                        />
                      }
                    </li>
                  </ul>
                </div>
                <div>
                  <ul className="flex-container center">
                    <li>
                      <div style={{"margin":"5px"}}>
                        <input
                          type="checkbox"
                          onChange={this.handleRandomOccupationCheck}
                          defaultChecked={this.state.startWithRandomCountries}
                        />
                          Place Armies Randomly
                      </div>
                      </li>
                      <li>
                      <div style={{"margin":"10px"}}>
                        <input
                          type="checkbox"
                          onChange={this.handleDiceCheck}
                          defaultChecked={this.state.useDice}
                        />
                          Use Dice
                      </div>
                    </li>
                  </ul>
                </div>
              </li>
              <a className="start-btn">START</a>
            </ul>
          </form>
      </fieldset>
    );
  }
};