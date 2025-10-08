import React, { Component, RefObject } from 'react';
import * as ImgMod from '@tools/imgmod';
import PopUp from '@components/basic/popup';
import checker from '@assets/checkerboard.png';

type AProps = {
  alpha?: boolean;
  default?: string;
  id?: string;
  disabled?: boolean;
  controlled?: boolean;
  linked?: boolean;
  unlink?: () => void;
  update?: (color: string) => void;
};

type AState = {
  open: boolean;
  hsla: ImgMod.Hsla;
  color: string;
  hex: string;
  bottom: boolean;
};

export default class ColorPicker extends Component<AProps, AState> {
  pickerRef: RefObject<HTMLButtonElement | null> = React.createRef();

  constructor(props: AProps) {
    super(props);

    let hsla: ImgMod.Hsla = [0, 100, 50, 1];
    if (props.default) hsla = ImgMod.hexToHsla(ImgMod.colorAsHex(props.default));

    this.state = {
      open: false,
      hsla: hsla,
      color: ImgMod.hslaToString(hsla),
      hex: ImgMod.hslaToHex(hsla),
      bottom: false
    };
  }

  componentDidUpdate = (prevProps: Readonly<AProps>) => {
    if (
      this.props.default &&
      prevProps.default !== this.props.default &&
      this.props.default !== this.state.color &&
      (this.props.controlled || this.props.linked)
    ) {
      const hsla = ImgMod.hexToHsla(ImgMod.colorAsHex(this.props.default));
      this.setState({
        hsla: hsla,
        color: ImgMod.hslaToString(hsla),
        hex: ImgMod.hslaToHex(hsla)
      });
    }
  };

  setHsla = (hsla: ImgMod.Hsla, hex?: string) => {
    const color = ImgMod.hslaToString(hsla);
    this.setState({
      hsla: hsla,
      color: color,
      hex: hex ?? ImgMod.hslaToHex(hsla)
    });
    if (this.props.update) this.props.update(color);
  };

  updateHue = (hue: number) => {
    const newHsla = this.state.hsla;
    newHsla[0] = hue;
    this.setHsla(newHsla);
  };

  updateSaturation = (saturation: number) => {
    const newHsla = this.state.hsla;
    newHsla[1] = saturation;
    this.setHsla(newHsla);
  };

  updateLightness = (lightness: number) => {
    const newHsla = this.state.hsla;
    newHsla[2] = lightness;
    this.setHsla(newHsla);
  };

  updateAlpha = (alpha: number) => {
    const newHsla = this.state.hsla;
    newHsla[3] = alpha;
    this.setHsla(newHsla);
  };

  setFromString = (color: string) => {
    const newHsla = ImgMod.colorAsHsla(color);
    if (!this.props.alpha) newHsla[3] = this.state.hsla[3];
    this.setHsla(newHsla, color);
  };

  togglePicker = () => {
    if (!this.pickerRef.current) return;

    const rect = this.pickerRef.current.getBoundingClientRect();
    const height = window.innerHeight;

    this.setState({
      open: !this.state.open,
      bottom: rect.top > height / 2
    });
  };

  render() {
    return (
      <div className="color-picker-parent">
        <button
          ref={this.pickerRef}
          className={'color-label' + (this.props.linked ? ' linked' : '')}
          style={{
            backgroundImage:
              'linear-gradient(to right,' +
              this.state.color +
              ',' +
              ImgMod.hslToString(this.state.hsla) +
              `),url(${checker})`
          }}
          id={this.props.id}
          disabled={this.props.disabled}
          onMouseDown={this.togglePicker}
        />
        {this.state.open && (
          <PopUp close={() => this.setState({ open: false })}>
            <div
              className={
                'color-picker ' + (this.state.bottom ? 'color-picker-bottom' : 'color-picker-top')
              }
              style={{
                display: this.state.open ? 'block' : 'none',
                left: `${this.pickerRef.current ? this.pickerRef.current.clientWidth / 2 - 100 : -90}px`
              }}
              draggable={true}
              onDragStart={e => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <div className="container">
                <input
                  value={this.state.hsla[0]}
                  min={0}
                  max={360}
                  step={1}
                  type="range"
                  onInput={e => this.updateHue(Number((e.target as HTMLInputElement).value))}
                  disabled={this.props.linked}
                  style={{
                    background:
                      'linear-gradient(to right,' +
                      `hsl(0,${this.state.hsla[1]}%,${this.state.hsla[2]}%),` +
                      `hsl(60,${this.state.hsla[1]}%,${this.state.hsla[2]}%),` +
                      `hsl(120,${this.state.hsla[1]}%,${this.state.hsla[2]}%),` +
                      `hsl(180,${this.state.hsla[1]}%,${this.state.hsla[2]}%),` +
                      `hsl(240,${this.state.hsla[1]}%,${this.state.hsla[2]}%),` +
                      `hsl(300,${this.state.hsla[1]}%,${this.state.hsla[2]}%),` +
                      `hsl(360,${this.state.hsla[1]}%,${this.state.hsla[2]}%)` +
                      ')'
                  }}
                />
                <input
                  value={this.state.hsla[1]}
                  min={0}
                  max={100}
                  step={1}
                  type="range"
                  onInput={e => this.updateSaturation(Number((e.target as HTMLInputElement).value))}
                  disabled={this.props.linked}
                  style={{
                    background:
                      'linear-gradient(to right,' +
                      `hsl(${this.state.hsla[0]},0%,${this.state.hsla[2]}%),` +
                      `hsl(${this.state.hsla[0]},100%,${this.state.hsla[2]}%)` +
                      ')'
                  }}
                />
                <input
                  value={this.state.hsla[2]}
                  min={0}
                  max={100}
                  step={1}
                  type="range"
                  onInput={e => this.updateLightness(Number((e.target as HTMLInputElement).value))}
                  disabled={this.props.linked}
                  style={{
                    background:
                      'linear-gradient(to right,' +
                      '#000000,' +
                      `hsl(${this.state.hsla[0]}, ${this.state.hsla[1]}%, 50%),` +
                      '#ffffff' +
                      ')'
                  }}
                />
                {this.props.alpha && (
                  <input
                    value={this.state.hsla[3]}
                    min={0}
                    max={1}
                    step={0.01}
                    type="range"
                    onInput={e => this.updateAlpha(Number((e.target as HTMLInputElement).value))}
                    disabled={this.props.linked}
                    style={{
                      backgroundImage:
                        'linear-gradient(to right,' +
                        'rgba(0,0,0,0),' +
                        ImgMod.hslToString(this.state.hsla) +
                        `),url(${checker})`
                    }}
                  />
                )}
                <span>
                  <input
                    placeholder="#ffffff"
                    value={this.state.hex}
                    onChange={e => this.setFromString(e.target.value)}
                    disabled={this.props.linked}
                  />
                </span>
                {this.props.unlink && <button onClick={this.props.unlink}>Unlink</button>}
              </div>
            </div>
          </PopUp>
        )}
      </div>
    );
  }
}
