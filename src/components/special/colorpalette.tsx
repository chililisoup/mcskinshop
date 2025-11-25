import React from 'react';
import * as ImgMod from '@tools/imgmod';
import checker from '@assets/checkerboard.png';
import DraggableWindow from '@components/basic/draggablewindow';
import PaletteManager, { usePalette } from '@tools/painting/paletteman';

type AProps = {
  close: () => void;
};

export default function ColorPalette({ close }: AProps) {
  const palette = usePalette();

  const inputValue = (e: React.FormEvent<HTMLInputElement>) =>
    Number((e.target as HTMLInputElement).value);

  const updateHsla = (e: React.FormEvent<HTMLInputElement>, index: number) =>
    setHsla(palette.hsla.with(index, inputValue(e)) as ImgMod.Hsla);

  const setFromString = (color: string) => setHsla(ImgMod.colorAsHsla(color), color);

  const setHsla = (hsla: ImgMod.Hsla, hex?: string) =>
    PaletteManager.set(ImgMod.hslaToRgba(hsla), hsla, hex);

  return (
    <DraggableWindow
      title="Color Palette"
      anchor={{ vw: 0, vh: 0.5 }}
      startPos={{ x: 64, y: 0 }}
      close={close}
    >
      <span>
        <button
          className={`material-symbols-outlined ${palette.locked ? 'selectable' : 'selected'}`}
          onClick={PaletteManager.toggleLocked}
        >
          {palette.locked ? 'lock' : 'lock_open_right'}
        </button>
      </span>
      <div className="color-palette color-picker">
        <div>
          {palette.colors.map((rgba, index) => (
            <button
              key={index}
              className={index === palette.selected ? 'selected' : undefined}
              style={{
                backgroundImage:
                  'linear-gradient(to right,' +
                  ImgMod.rgbaToHex(rgba) +
                  ',' +
                  ImgMod.rgbaToHex(rgba.with(3, 255) as ImgMod.Rgba) +
                  `),url(${checker})`
              }}
              onClick={() => PaletteManager.select(index)}
            />
          ))}
        </div>
        <hr />
        <div className="container">
          <input
            value={palette.hsla[0]}
            min={0}
            max={360}
            step={1}
            type="range"
            onInput={e => updateHsla(e, 0)}
            style={{
              background:
                'linear-gradient(to right,' +
                `hsl(0,${palette.hsla[1]}%,${palette.hsla[2]}%),` +
                `hsl(60,${palette.hsla[1]}%,${palette.hsla[2]}%),` +
                `hsl(120,${palette.hsla[1]}%,${palette.hsla[2]}%),` +
                `hsl(180,${palette.hsla[1]}%,${palette.hsla[2]}%),` +
                `hsl(240,${palette.hsla[1]}%,${palette.hsla[2]}%),` +
                `hsl(300,${palette.hsla[1]}%,${palette.hsla[2]}%),` +
                `hsl(360,${palette.hsla[1]}%,${palette.hsla[2]}%)` +
                ')'
            }}
          />
          <input
            value={palette.hsla[1]}
            min={0}
            max={100}
            step={1}
            type="range"
            onInput={e => updateHsla(e, 1)}
            style={{
              background:
                'linear-gradient(to right,' +
                `hsl(${palette.hsla[0]},0%,${palette.hsla[2]}%),` +
                `hsl(${palette.hsla[0]},100%,${palette.hsla[2]}%)` +
                ')'
            }}
          />
          <input
            value={palette.hsla[2]}
            min={0}
            max={100}
            step={1}
            type="range"
            onInput={e => updateHsla(e, 2)}
            style={{
              background:
                'linear-gradient(to right,' +
                '#000000,' +
                `hsl(${palette.hsla[0]}, ${palette.hsla[1]}%, 50%),` +
                '#ffffff' +
                ')'
            }}
          />
          <input
            value={palette.hsla[3]}
            min={0}
            max={1}
            step={0.01}
            type="range"
            onInput={e => updateHsla(e, 3)}
            style={{
              backgroundImage:
                'linear-gradient(to right,' +
                'rgba(0,0,0,0),' +
                ImgMod.hslToString(palette.hsla) +
                `),url(${checker})`
            }}
          />
          <span>
            <input
              placeholder="#ffffff"
              value={palette.hex}
              type="text"
              onChange={e => setFromString(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
            />
          </span>
        </div>
      </div>
    </DraggableWindow>
  );
}
