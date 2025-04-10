import React, { Component, RefObject } from 'react';
import no from '@assets/no.png';

export type Option = [entry: string, imageSrc: string];

type AProps = {
  default?: string;
  emptyOption?: boolean;
  targetWidth: number;
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
    const columns = Math.max(1, Math.round(width / this.props.targetWidth));

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
        className={!this.state.selected ? 'highlighted' : ''}
      >
        <img alt="None" src={no} />
      </div>
    );
  };

  addOption = (option: Option) => {
    return (
      <img
        style={{
          width: this.state.width - 6
        }}
        onClick={() => this.select(option[1])} // Should use option[0] here and below but this is easier for now
        className={this.state.selected === option[1] ? 'highlighted' : ''}
        alt={option[0]}
        src={option[1]}
      />
    );
  };

  render() {
    return (
      <div className="grid-select" ref={this.gridRef}>
        {this.props.emptyOption && this.addNoneOption()}
        {this.props.options.map(this.addOption)}
      </div>
    );
  }
}

export default GridSelect;
