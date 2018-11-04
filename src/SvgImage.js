import React from 'react';
import { worldMap } from './maps/worldmap';

export class SvgImage extends React.Component {
  constructor(props) {
    super(props);
    var parsedDoc = new DOMParser().parseFromString(worldMap, 'text/html');
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
      
      return (
        <ReactPath key={path.id} d={path.getAttribute('d')} style={style} id={path.id}/>
      );
    });

    return (
    <svg width="895" height="532" version="1.0" data-revision="112" style={{overflow: "visible"}} >
    <defs>
  <pattern patternUnits="userSpaceOnUse" width="32" height="32" patternTransform="scale(.3)" id="FogPattern">
    <image width="32" height="32" id="FogImage" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOvQAADr0BR/uQrQAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4yMfEgaZUAAAHYSURBVEhLtZa7rkFBGEbnMY5GoSduBa1G6xWIICQSDYVCp3KLW6GWaMQlKDQUruGlzhITDrbBdmbV+1+fzHz/hDjest/v+/1+oVAIhUI2m+1Hic/ny+fzvV5vuVzK+QduArDPZrNms5lMJr1er8VikSYj3G53IpFoNBrT6ZRBqXjgGnC2t9vtdDrNT1PbXS5XLBar1Wqj0Wi73UqFETJAkx1OAfrsILTaQdAZblWTHQSNpDM67JwN9RX0/WUjTdj5jPqyIoJt0mHnY1aENRRS8wTTdkZYQ05eFfCNnUFWHcnTgC/tjJ89xgH/ZQeDAKfT+al9t9uNx+NHO9wHOByOaDRarVbft9P3yWRSr9fj8fidHW4C7HZ7JBKpVCrD4fB9Oy9Nq9VKpVIej0eK/nANONtLpdJgMNhsNlKg5J13TAZossMpgHPXZAfBwXGrmuwgstks9dJkt1qtotvtUmEddu41GAyKxWLBmkiBko/sLEQ4HM7lcuJwOEiBkk/trHS5XOZ47v94GWLCzr2yrev1+nWAOfvlpXkR8KUdVAHf2+FpwL/YwTiAas3n806nk8lk/H6/2k7faSSdMXyDjQNWqxV/yIrFYiAQUNvZVbaJvtNIOiPnLxyPv4dN6Ar8opL0AAAAAElFTkSuQmCC"></image>
  </pattern>
  <filter width="200%" height="200%" x="-50%" y="-50%" id="glow">
    <feColorMatrix type="matrix" values="1 0 0 0 0 1 1 1 1 0 0 0 0 0 0 0 0 0 1 0"></feColorMatrix>
    <feGaussianBlur stdDeviation="18.419937500000003" result="coloredBlur" id="glowBlur"></feGaussianBlur>
    <feMerge>
      <feMergeNode in="coloredBlur"></feMergeNode>
      <feMergeNode in="SourceGraphic"></feMergeNode>
    </feMerge>
  </filter>
</defs>

      <g>
        {paths}
     </g>
    </svg>)
  }
};

class ReactPath extends React.Component {

  render() {

    return (
      <path d={this.props.d} style={this.props.style} id={this.props.id} >
        <title>
          {this.props.id}
        </title>
      </path>
    );
  }

}

