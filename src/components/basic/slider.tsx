import React, { Component } from 'react';
import * as Util from '@tools/util';

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
  allowExceed?: boolean;
  enforceStep?: boolean;
};

type AState = {
  typing: boolean;
};

class Slider extends Component<AProps, AState> {
  prevValues = [0, 0, 0];
  textVal = '0';

  constructor(props: AProps) {
    super(props);

    this.state = {
      typing: false
    };

    this.prevValues = [props.value, props.value, props.value];
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

  setFromText = () => {
    this.setState({ typing: false });

    if (!this.props.callback) return;

    let value = Number(this.textVal);

    if (this.props.enforceStep) {
      const step = this.props.step ?? 1;
      value += step / 2;
      value -= value % step;
    }

    if (!this.props.allowExceed)
      value = Util.clamp(value, this.props.min ?? 0, this.props.max ?? 100);

    this.prevValues = [value, value, value];
    this.props.callback(value);
  };

  render() {
    const min = this.props.min ?? 0;
    const max = this.props.max ?? 100;
    const stop = Util.clamp((this.props.value - min) / (max - min), 0, 1) * 100;
    const shadow = Math.min(stop + 6, 100);

    return (
      <div
        className="stack"
        onClick={() => {
          this.prevValues.shift();
          this.prevValues.push(this.props.value);
        }}
        onDoubleClick={() => {
          if (this.props.callback) this.props.callback(this.prevValues[0]);

          this.textVal = String(this.prevValues[0]);
          this.setState({ typing: true });
        }}
      >
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
            this.props.callback?.(Number((e.target as HTMLInputElement).value))
          }
          style={{
            background:
              'linear-gradient(to right,' +
              `var(--${this.props.disabled ? 'no-accent' : 'accent'}) ${stop}%,` +
              `color-mix(in srgb, var(--input) 100%, var(--dark-shadow) 100%) ${stop}%,` +
              `var(--input) ${shadow}%)`
          }}
        />
        <div className="slider-label center">
          {!this.state.typing && <p>{this.buildLabel()}</p>}
          {this.state.typing && (
            <input
              type="number"
              autoFocus={true}
              defaultValue={this.textVal}
              min={this.props.min}
              max={this.props.max}
              step={this.props.step}
              onChange={e => {
                this.textVal = e.target.value;
              }}
              onFocus={e => e.target.select()}
              onBlur={() => this.setFromText()}
              onKeyDown={e => e.key === 'Enter' && this.setFromText()}
            />
          )}
        </div>
      </div>
    );
  }
}

export default Slider;
