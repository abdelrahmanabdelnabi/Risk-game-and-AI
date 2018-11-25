import React from 'react';
import { playerTerritoryColor, AttackingStateEnum } from './RiskGameBoard';

export class SvgImage extends React.Component {
  constructor(props) {
    super(props);
    var parsedDoc = new DOMParser().parseFromString(props.map.image, 'text/html');
    this.state = {paths: parsedDoc.getElementsByTagName('svg')[0].getElementsByTagName('path')};
  }

  render() {
    const paths = Array.from(this.state.paths).map((path) => {
      const style = {
        fill: path.style.fill,
        fillOpacity: path.style.fillOpacity,
        fillRule: path.style.fillRule,
        strokeWidth: path.style.strokeWidth,
        stroke: path.style.stroke,
        strokeMiterlimit: path.style.strokeMiterlimit,
        stokeOpacity: path.style.strokeOpacity
      }

      const idNum = path.id.split("_")[1];

      const countryState = path.id.split("_")[0] === 'Territory' ? this.props.countries[idNum] : null;
      const countryName = path.id.split("_")[0] === 'Territory' ? this.props.names[idNum] : null;

      var attackState = AttackingStateEnum.normal;

      if(this.props.attackingCountry === idNum)
        attackState = AttackingStateEnum.attacking;
      else if(this.props.defendingCountries.indexOf(+idNum) > -1)
        attackState = AttackingStateEnum.being_attacked;

      return (
        <ReactPath state={countryState} attackState={attackState} key={path.id}
         d={path.getAttribute('d')} style={style} id={path.id} name={countryName} onClick={this.props.onClick}/>
      );
    });

    return (
    <svg width="895" height="532" version="1.0" data-revision="112" style={{overflow: "visible"}} >
    
<rect x="0.01495404" y="0.05651855" width="894.9685" height="531.9553" rx="0" ry="0" style={{fill: "#374548", fillOpacity: 1}} id="obj1"></rect>
      <g>
        {paths}
     </g>
    </svg>)
  }
};

class ReactPath extends React.Component {

  constructor(props) {
    super(props);
    this.state = {hover: false}
  }

  onMouseEnter() {
    this.setState({hover: true});
  }

  onMouseLeave() {
    this.setState({hover: false});
  }

  render() {
    var className= "non-territory";
    const isTerritory = this.props.id.split("_")[0] === "Territory";
    
    if(isTerritory) {
      className = "territory";

      this.props.style.fill =  playerTerritoryColor(this.props.state.owner);
      if(this.state.hover)
        this.props.style.strokeWidth = 3
      else
        this.props.style.strokeWidth = 1;

      if (this.props.attackState === AttackingStateEnum.attacking) {
        // we are the selected attacking territory: apply a differenet styling
        this.props.style.fillOpacity = 0.5;
        className += " attacking";
      } else if (this.props.attackState === AttackingStateEnum.being_attacked) {
        this.props.style.strokeWidth = 4;
        this.props.style.stroke = "rgb(80,255,0)";
        className += " defending";
      }
    }
 
    const customStyle = {...this.props.style};

    return (
      <path d={this.props.d} style={customStyle} className={className} id={this.props.id} onClick={() => this.props.onClick(this.props.id)}

        // next line causes a significant increase in cpu usage
        onMouseEnter={() => this.onMouseEnter()} onMouseLeave={() => this.onMouseLeave()} >
        <title>
          {this.props.name}
        </title>
      </path>
    );
  }

}