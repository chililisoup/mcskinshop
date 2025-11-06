import React, { useEffect, useRef, useState } from 'react';
import * as ImgMod from '@tools/imgmod';
import PopUp from '@components/basic/popup';
import checker from '@assets/checkerboard.png';

type AProps = {
  alpha?: boolean;
  default?: string;
  id?: string;
  title?: string;
  disabled?: boolean;
  controlled?: boolean;
  linked?: boolean;
  unlink?: () => void;
  update?: (color: string, finished: boolean) => void;
};

export default function ColorPicker(props: AProps) {
  const pickerRef: React.RefObject<HTMLButtonElement | null> = useRef(null);

  const defaultHsla: ImgMod.Hsla = props.default
    ? ImgMod.hexToHsla(ImgMod.colorAsHex(props.default))
    : [0, 100, 50, 1];
  const [hslaValue, setHslaValue] = useState(defaultHsla);
  const [colorValue, setColorValue] = useState(ImgMod.hslaToString(defaultHsla));
  const [hexValue, setHexValue] = useState(ImgMod.hslaToHex(defaultHsla));

  const [open, setOpen] = useState(false);
  const [bottom, setBottom] = useState(false);

  useEffect(() => {
    if (!props.default || props.default === colorValue) return;
    if (!props.controlled && !props.linked) return;

    const hsla = ImgMod.hexToHsla(ImgMod.colorAsHex(props.default));
    setHslaValue(hsla);
    setColorValue(ImgMod.hslaToString(hsla));
    setHexValue(ImgMod.hslaToHex(hsla));
  }, [props.default, props.controlled, props.linked]);

  function setHsla(hsla: ImgMod.Hsla, hex?: string) {
    const color = ImgMod.hslaToString(hsla);
    setHslaValue(hsla);
    setColorValue(color);
    setHexValue(hex ?? ImgMod.hslaToHex(hsla));
    props.update?.(color, false);
  }

  function updateHue(hue: number) {
    const newHsla = hslaValue;
    newHsla[0] = hue;
    setHsla(newHsla);
  }

  function updateSaturation(saturation: number) {
    const newHsla = hslaValue;
    newHsla[1] = saturation;
    setHsla(newHsla);
  }

  function updateLightness(lightness: number) {
    const newHsla = hslaValue;
    newHsla[2] = lightness;
    setHsla(newHsla);
  }

  function updateAlpha(alpha: number) {
    const newHsla = hslaValue;
    newHsla[3] = alpha;
    setHsla(newHsla);
  }

  function setFromString(color: string) {
    const newHsla = ImgMod.colorAsHsla(color);
    if (!props.alpha) newHsla[3] = hslaValue[3];
    setHsla(newHsla, color);
  }

  function togglePicker() {
    if (!pickerRef.current) return;

    setOpen(!open);
    if (open) return;

    const rect = pickerRef.current.getBoundingClientRect();
    const height = window.innerHeight;

    setBottom(rect.top > height / 2);
  }

  const inputValue = (e: React.FormEvent<HTMLInputElement>) =>
    Number((e.target as HTMLInputElement).value);

  return (
    <div className="color-picker-parent">
      <button
        ref={pickerRef}
        className={'color-label' + (props.linked ? ' linked' : '')}
        style={{
          backgroundImage:
            'linear-gradient(to right,' +
            colorValue +
            ',' +
            ImgMod.hslToString(hslaValue) +
            `),url(${checker})`
        }}
        id={props.id}
        title={props.title}
        disabled={props.disabled}
        onMouseDown={togglePicker}
      />
      {open && (
        <PopUp
          close={() => {
            setOpen(false);
            props.update?.(colorValue, true);
          }}
        >
          <div
            className={'color-picker ' + (bottom ? 'color-picker-bottom' : 'color-picker-top')}
            style={{
              display: open ? 'block' : 'none',
              left: `${pickerRef.current ? pickerRef.current.clientWidth / 2 - 100 : -90}px`
            }}
            draggable={true}
            onDragStart={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <div className="container">
              <input
                value={hslaValue[0]}
                min={0}
                max={360}
                step={1}
                type="range"
                onInput={e => updateHue(inputValue(e))}
                disabled={props.linked}
                style={{
                  background:
                    'linear-gradient(to right,' +
                    `hsl(0,${hslaValue[1]}%,${hslaValue[2]}%),` +
                    `hsl(60,${hslaValue[1]}%,${hslaValue[2]}%),` +
                    `hsl(120,${hslaValue[1]}%,${hslaValue[2]}%),` +
                    `hsl(180,${hslaValue[1]}%,${hslaValue[2]}%),` +
                    `hsl(240,${hslaValue[1]}%,${hslaValue[2]}%),` +
                    `hsl(300,${hslaValue[1]}%,${hslaValue[2]}%),` +
                    `hsl(360,${hslaValue[1]}%,${hslaValue[2]}%)` +
                    ')'
                }}
              />
              <input
                value={hslaValue[1]}
                min={0}
                max={100}
                step={1}
                type="range"
                onInput={e => updateSaturation(inputValue(e))}
                disabled={props.linked}
                style={{
                  background:
                    'linear-gradient(to right,' +
                    `hsl(${hslaValue[0]},0%,${hslaValue[2]}%),` +
                    `hsl(${hslaValue[0]},100%,${hslaValue[2]}%)` +
                    ')'
                }}
              />
              <input
                value={hslaValue[2]}
                min={0}
                max={100}
                step={1}
                type="range"
                onInput={e => updateLightness(inputValue(e))}
                disabled={props.linked}
                style={{
                  background:
                    'linear-gradient(to right,' +
                    '#000000,' +
                    `hsl(${hslaValue[0]}, ${hslaValue[1]}%, 50%),` +
                    '#ffffff' +
                    ')'
                }}
              />
              {props.alpha && (
                <input
                  value={hslaValue[3]}
                  min={0}
                  max={1}
                  step={0.01}
                  type="range"
                  onInput={e => updateAlpha(inputValue(e))}
                  disabled={props.linked}
                  style={{
                    backgroundImage:
                      'linear-gradient(to right,' +
                      'rgba(0,0,0,0),' +
                      ImgMod.hslToString(hslaValue) +
                      `),url(${checker})`
                  }}
                />
              )}
              <span>
                <input
                  placeholder="#ffffff"
                  value={hexValue}
                  onChange={e => setFromString(e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                  disabled={props.linked}
                />
              </span>
              {props.unlink && <button onClick={props.unlink}>Unlink</button>}
            </div>
          </div>
        </PopUp>
      )}
    </div>
  );
}
