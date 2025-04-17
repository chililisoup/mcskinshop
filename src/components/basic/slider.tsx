import React, { Component } from 'react';
import * as Util from '../../tools/util';

export type SubType = 'hidden' | 'number' | 'percent' | 'degrees' | 'radiansAsDegrees';

type AProps = {
  callback?: (value: number) => void;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  id?: string;
  subtype?: SubType;
  disabled?: boolean;
};

class Slider extends Component<AProps> {
  constructor(props: AProps) {
    super(props);
  }

  buildLabel = () => {
    const subtype = this.props.subtype ?? 'number';
    const decimals = this.props.step ? Math.ceil(Math.max(Math.log10(1 / this.props.step), 0)) : 0;
    const value = this.props.value.toFixed(decimals);

    switch (subtype) {
      case 'hidden':
        return '';
      case 'number':
        return value;
      case 'percent':
        return `${value}%`;
      case 'degrees':
        return `${value}°`;
      case 'radiansAsDegrees':
        return `${Util.radToDeg(this.props.value).toFixed(Math.max(decimals - 2, decimals - 1, 0))}°`;
    }
  };

  render() {
    const min = this.props.min ?? 0;
    const max = this.props.max ?? 100;
    const stop = Util.clamp((this.props.value - min) / (max - min), 0, 1) * 100;
    const shadow = Math.min(stop + 8, 100);

    return (
      <div className="stack">
        <input
          type="range"
          className="slider"
          id={this.props.id}
          value={this.props.value}
          min={this.props.min}
          max={this.props.max}
          step={this.props.step}
          disabled={this.props.disabled}
          onInput={e =>
            this.props.callback && this.props.callback(Number((e.target as HTMLInputElement).value))
          }
          style={{
            background: `linear-gradient(to right,
              var(--${this.props.disabled ? 'no-accent' : 'accent'}) ${stop}%,
              var(--dark-shadow) ${stop}%,
              var(--medium-shadow) ${shadow}%)`
          }}
        />
        <div className="slider-label center">
          <p>{this.buildLabel()}</p>
        </div>
      </div>
    );
  }
}

export default Slider;
