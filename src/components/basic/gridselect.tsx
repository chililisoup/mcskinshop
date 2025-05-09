import React, { Component, RefObject } from 'react';
import no from '@assets/no.png';

export type Option = [entry: string, imageSrc: string];

export type Crop = {
  aspectRatio: number,
  x: number,
  y: number,
  sx: number,
  sy: number
};

type AProps = {
  default?: string;
  emptyOption?: boolean;
  targetWidth?: number;
  crop?: Crop;
  options: readonly Option[];
  select: (option: string | false) => void;
};

type AState = {
  selected: string | false;
  width: number;
};

class GridSelect extends Component<AProps, AState> {
  gridRef: RefObject<HTMLDivElement | null> = React.createRef();

  constructor(props: AProps) {
    super(props);

    this.state = {
      selected: this.props.default ?? false,
      width: 1
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleWindowResize);

    this.handleWindowResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleWindowResize);
  }

  handleWindowResize = () => {
    if (!this.gridRef.current) return;

    const width = this.gridRef.current.clientWidth;
    const columns = Math.max(1, Math.round(width / (this.props.targetWidth ?? 100)));

    this.setState({ width: width / columns });
  };

  select = (option: string | false) => {
    this.props.select(option);
    this.setState({ selected: option });
  };

  addNoneOption = () => {
    return (
      <div
        style={{
          width: this.state.width - 6
        }}
        onClick={() => this.select(false)}
        className={'none-option' + (!this.state.selected ? ' highlighted' : '')}
      >
        <img alt="None" src={no} />
      </div>
    );
  };

  addOption = (option: Option, divStyle: React.CSSProperties, imgStyle?: React.CSSProperties) => {
    return (
      <div
        style={divStyle}
        onClick={() => this.select(option[1])} // Should use option[0] here and below but this is easier for now
        className={'true-option' + (this.state.selected === option[1] ? ' highlighted' : '')}
      >
        <img
          alt={option[0]}
          src={option[1]}
          style={imgStyle}
        />
      </div>
    );
  };

  render() {
    let divStyle: React.CSSProperties = {
      width: this.state.width - 6
    };

    let imgStyle: React.CSSProperties | undefined = undefined;

    if (this.props.crop) {
      const divWidth = this.state.width - 6;
      const divHeight = (divWidth / this.props.crop.aspectRatio) * (this.props.crop.sy / this.props.crop.sx);

      divStyle = {
        width: divWidth,
        height: divHeight
      };

      const imgWidth = divWidth / this.props.crop.sx;
      const imgHeight = divHeight / this.props.crop.sy;
  
      imgStyle = {
        width: imgWidth,
        height: imgHeight,
        marginLeft: -(imgWidth * this.props.crop.x),
        marginTop: -(imgHeight * this.props.crop.y)
      };
    }

    return (
      <div className="grid-select" ref={this.gridRef}>
        {this.props.emptyOption && this.addNoneOption()}
        {this.props.options.map(option => this.addOption(option, divStyle, imgStyle))}
      </div>
    );
  }
}

export default GridSelect;
