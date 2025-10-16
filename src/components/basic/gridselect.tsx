import React, { Component, RefObject } from 'react';
import no from '@assets/no.png';

export type Option = [entry: string, imageSrc: string, hasDeleteButton?: boolean] | false;

export type Crop = {
  aspectRatio: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
};

type AProps = {
  targetWidth?: number;
  crop?: Crop;
  options: readonly Option[];
  default?: Option;
  select: (option: Option) => void;
  delete?: (option: Option) => void;
};

type AState = {
  selected: Option;
  width: number;
};

export default class GridSelect extends Component<AProps, AState> {
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

  select = (option: Option) => {
    this.props.select(option);
    this.setState({ selected: option });
  };

  addOption = (option: Option, divStyle: React.CSSProperties, imgStyle?: React.CSSProperties) => {
    return (
      <div
        style={divStyle}
        onClick={() => this.select(option)}
        className={
          (option ? 'true-option' : 'none-option') +
          (this.state.selected === option ? ' highlighted' : '')
        }
      >
        {option ? (
          <img alt={option[0]} src={option[1]} style={imgStyle} />
        ) : (
          <img alt="None" src={no} />
        )}
        {option && option[2] && (
          <button
            className="delete-button"
            onClickCapture={e => {
              e.preventDefault();
              e.stopPropagation();

              if (this.state.selected === option) this.select(false);
              this.props.delete?.(option);
            }}
          >
            &#10006;
          </button>
        )}
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
      const divHeight =
        (divWidth / this.props.crop.aspectRatio) * (this.props.crop.sy / this.props.crop.sx);

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
        {this.props.options.map(option => this.addOption(option, divStyle, imgStyle))}
      </div>
    );
  }
}
