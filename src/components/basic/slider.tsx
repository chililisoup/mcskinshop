import React, { Component } from 'react';
import * as Util from '@tools/util';

export type SubType = 'hidden' | 'number' | 'percent' | 'degrees' | 'radiansAsDegrees';

type AProps = {
  callback?: (value: number, finished: boolean) => void;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  snap?: number;
  id?: string;
  subtype?: SubType;
  disabled?: boolean;
  allowExceed?: boolean;
  enforceStep?: boolean;
};

type AState = {
  typing: boolean;
};

export default class Slider extends Component<AProps, AState> {
  prevValues = [0, 0, 0];
  textVal = '0';
  ctrlKey = false;
  timer?: NodeJS.Timeout;
  firstInput = true;

  constructor(props: AProps) {
    super(props);

    this.state = {
      typing: false
    };

    this.prevValues = [props.value, props.value, props.value];
  }

  min = () => this.props.min ?? 0;

  max = () => this.props.max ?? 100;

  step = () => this.props.step ?? 1;

  snap = () => {
    if (this.props.snap) return this.props.snap;

    const step = this.step();
    const snap = step * 5;

    const diff = this.max() - this.min();
    return snap * 4 > diff ? step : snap;
  };

  clamp = (value: number) => Util.clamp(value, this.min(), this.max());

  alignValue = (value: number, align: number) => {
    const inv = 1 / align;
    const min = this.min();
    return Math.round((value - min) * inv) / inv + min;
  };

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
      const step = this.step();
      value += step / 2;
      value -= value % step;
    }

    if (!this.props.allowExceed) value = this.clamp(value);

    this.prevValues = [value, value, value];
    this.props.callback(value, true);
  };

  sendInputCallback = (e: React.FormEvent<HTMLInputElement>, finished: boolean) => {
    const value = Number((e.target as HTMLInputElement).value);
    this.props.callback?.(
      this.clamp(this.alignValue(value, this.ctrlKey ? this.snap() : this.step())),
      finished
    );
  };

  onInput = (e: React.FormEvent<HTMLInputElement>) => {
    if (!this.firstInput) this.closeTimer();
    this.firstInput = false;
    this.sendInputCallback(e, false);
  };

  closeTimer = () => {
    clearTimeout(this.timer);
    this.timer = undefined;
  };

  startTyping = () => {
    this.closeTimer();
    this.props.callback?.(this.prevValues[0], false);
    this.textVal = String(this.prevValues[0]);
    this.setState({ typing: true });
  };

  onMouseDown = () => {
    this.closeTimer();
    this.timer = setTimeout(this.startTyping, 1000);
    this.firstInput = true;
  };

  render() {
    const min = this.min();
    const max = this.max();
    const step = this.step();
    const buffer = (max - min) / 100;
    const stop = Util.clamp((this.props.value - min) / (max - min), 0, 1) * 100;
    const shadow = Math.min(stop + 6, 100);

    return (
      <div
        className="stack"
        onClick={() => {
          this.prevValues.shift();
          this.prevValues.push(this.props.value);
        }}
        onDoubleClick={this.startTyping}
        onMouseDown={this.onMouseDown}
        onTouchStart={this.onMouseDown}
        onMouseUp={this.closeTimer}
        onTouchEnd={this.closeTimer}
      >
        <input
          type="range"
          className="slider"
          id={this.props.id}
          value={this.props.value}
          min={min - buffer}
          max={max + buffer}
          step={step}
          disabled={this.props.disabled}
          onClick={e => this.sendInputCallback(e, true)}
          onInput={this.onInput}
          onKeyDown={e => (this.ctrlKey = e.ctrlKey)}
          onKeyUp={e => (this.ctrlKey = e.ctrlKey)}
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
              min={min - buffer}
              max={max + buffer}
              step={step}
              onChange={e => {
                this.textVal = e.target.value;
              }}
              onFocus={e => e.target.select()}
              onBlur={() => this.setFromText()}
              onKeyDown={e => {
                if (e.key === 'Enter') this.setFromText();
                e.stopPropagation();
              }}
            />
          )}
        </div>
      </div>
    );
  }
}
