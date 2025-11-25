import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import Speaker from '@tools/speaker';
import { useEffect, useState } from 'react';

const DEFAULT_COLORS: ImgMod.Rgba[] = [
  [0, 0, 0, 255],
  [24, 20, 66, 255],
  [54, 70, 99, 255],
  [121, 142, 161, 255],
  [178, 203, 215, 255],
  [227, 84, 84, 255],
  [249, 131, 21, 255],
  [238, 212, 23, 255],
  [247, 224, 206, 255],
  [242, 201, 171, 255],
  [236, 175, 131, 255],
  [238, 166, 114, 255],
  [235, 151, 92, 255],
  [248, 155, 200, 255],
  [255, 255, 255, 255],
  [112, 207, 48, 255],
  [214, 133, 67, 255],
  [162, 93, 37, 255],
  [101, 54, 16, 255],
  [73, 39, 11, 255],
  [48, 26, 8, 255],
  [194, 67, 208, 255],
  [70, 83, 200, 255],
  [69, 160, 196, 255]
];

export default abstract class PaletteManager {
  private static colors: ImgMod.Rgba[] = DEFAULT_COLORS.map(color => [...color]);
  private static selected: number | null = 0;
  private static activeHsla: ImgMod.Hsla = [0, 0, 0, 1];
  private static activeHex = '#000000';
  private static locked = true;

  static speaker = new Speaker(() => this.get());

  static get = () => ({
    colors: [...this.colors] as const,
    selected: this.selected,
    rgba: this.getCurrentRgba(),
    hsla: this.activeHsla,
    hex: this.activeHex,
    alpha: this.getCurrentRgba()[3] / 255,
    locked: this.locked
  });

  static set = (rgba: ImgMod.Rgba, hsla?: ImgMod.Hsla, hex?: string) => {
    if (
      (!hsla || Util.arraysEqual(hsla, this.activeHsla)) &&
      this.selected !== null &&
      Util.arraysEqual(this.colors[this.selected], rgba)
    )
      return;
    this.activeHsla = hsla ?? ImgMod.rgbaToHsla(rgba);
    this.activeHex = hex ?? ImgMod.rgbaToHex(rgba);
    if (this.locked) this.selected = null;
    else if (this.selected !== null) this.colors[this.selected] = [...rgba];
    this.speaker.updateListeners();
  };

  static selectOrSet = (rgba: ImgMod.Rgba) => {
    for (let i = 0; i < this.colors.length; i++)
      if (Util.arraysEqual(this.colors[i], rgba)) return this.select(i);
    this.set(rgba);
  };

  static select = (index: number) => {
    this.selected = index;
    this.updateActive();
    this.speaker.updateListeners();
  };

  static toggleLocked = () => {
    this.locked = !this.locked;
    this.speaker.updateListeners();
  };

  static getCurrentRgba = (): ImgMod.Rgba =>
    this.selected === null ? ImgMod.hslaToRgba(this.activeHsla) : [...this.colors[this.selected]];

  static updateActive = () => {
    const rgba = this.getCurrentRgba();
    this.activeHsla = ImgMod.rgbaToHsla(rgba);
    this.activeHex = ImgMod.rgbaToHex(rgba);
  };

  static getSwatch = () => {
    const rgba = this.getCurrentRgba();
    return {
      color: ImgMod.rgbaToHex(rgba),
      opaqueColor: ImgMod.rgbaToHex(rgba, false),
      alpha: rgba[3] / 255
    };
  };

  static loadColors = (colors: ImgMod.Rgba[]) => {
    this.colors =
      colors.length >= 24
        ? colors.map(color => [...color])
        : new Array(Math.max(colors.length, 24))
            .fill(undefined)
            .map((_, index) =>
              colors.length > index ? [...colors[index]] : [...DEFAULT_COLORS[index]]
            );
    this.selected = 0;
    this.updateActive();
    this.speaker.updateListeners();
  };

  static resetColors = () => this.loadColors(DEFAULT_COLORS);
}

export function usePalette() {
  const [palette, setPalette] = useState(PaletteManager.get());

  PaletteManager.speaker.registerListener(setPalette);
  useEffect(() => {
    PaletteManager.speaker.registerListener(setPalette);
    return () => PaletteManager.speaker.unregisterListener(setPalette);
  }, [palette]);

  return palette;
}
