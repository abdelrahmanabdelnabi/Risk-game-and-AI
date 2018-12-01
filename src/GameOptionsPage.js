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
      gameMap: 'World',
      players: [
        {name: 'human', isAI: false},
        {name: 'passive', isAI: true}
      ],
      startWithRandomCountries: false,
      useDice: false
    };
    this.handleMapChange = this.handleMapChange.bind(this);
    this.handleModeChange = this.handleModeChange.bind(this);
    this.handleFirstPlayerChange = this.handleFirstPlayerChange.bind(this);
    this.handleSecondPlayerChange = this.handleSecondPlayerChange.bind(this);
    this.handleRandomOccupationCheck = this.handleRandomOccupationCheck.bind(this);
    this.handleDiceCheck = this.handleDiceCheck.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
  }

  handleMapChange(map) {
    this.setState({...this.state, gameMap: map.value})
  }

  handleModeChange(mode) {
    if (mode.value === 'simulation') {
      this.setState({
        ...this.state,
        players: [{name: 'passive', isAI: true}, {name: 'aggresive', isAI: true}],
        gameMode: mode.value
      });
    } else {
      this.setState({
        ...this.state,
        players: [{name: 'human', isAI: false}, {name: 'passive', isAI: true}],
        gameMode: mode.value
      });
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
    const options = {
      gameMap: this.state.gameMap,
      useDice: this.state.useDice,
      startWithRandomCountries: this.state.startWithRandomCountries,
      players: this.state.players,
      unitsPerPlayer: 27
    }
    this.props.onOptionsSubmit(options);
  }

  render() {
    let gameModes = ['playing', 'simulation'];
    let maps = ['World', 'USA'];
    let players = [
      {name: 'human', isAI: false},
      {name: 'passive', isAI: true},
      {name: 'aggresive', isAI: true},
      {name: 'pacifist', isAI: true},
      {name: 'greedy', isAI: true},
      {name: 'A_star', isAI: true},
      {name: 'A_star_realtime', isAI: true},
      {name: 'minimax', isAI: true}
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
                        <span>Game Map:</span>
                      </div>
                    </li>
                    <li>
                      <SelectList
                        className="option-field"
                        data={maps}
                        value={this.state.gameMap}
                        onChange={value => this.handleMapChange({value})}
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
                        textField='name'
                        value={this.state.players[0]}
                        onChange={value => this.handleFirstPlayerChange({value})}
                      />
                    }
                    {
                      this.state.gameMode === 'simulation' &&
                      <Combobox
                        disabled={[players[0]]}
                        className="option-field"
                        data={players}
                        textField='name'
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
                        textField='name'
                        value={this.state.players[1]}
                        onChange={value => this.handleSecondPlayerChange({value})}
                      />
                    }
                      {
                        this.state.gameMode === 'simulation' &&
                        <Combobox
                          disabled={[players[0]]}
                          className="option-field"
                          data={players}
                          textField='name'
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
              <a onClick={this.handleFormSubmit} className="start-btn">START</a>
            </ul>
          </form>
      </fieldset>
    );
  }
};