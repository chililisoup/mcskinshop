import { useEffect, useState } from 'react';
import Speaker from '@tools/speaker';
import SkinManager from '../skinman';
import * as ImgMod from '@tools/imgmod';
import * as Boundaries from '@tools/painting/boundaries';
import * as Mirrors from '@tools/painting/mirrors';
import EditManager from '../editman';

export const BRUSH_TYPES = ['pencil', 'eraser', 'bucket'] as const;
export const FILL_BOUNDARIES = ['face', 'part', 'none'] as const;

type Brush = {
  color: string;
  opaqueColor: string;
  opacity: number;
  size: number;
  type: (typeof BRUSH_TYPES)[number];
  eyedropper: boolean;
  tolerance: number;
  continuous: boolean;
  fillBoundary: (typeof FILL_BOUNDARIES)[number];
  mirrorX: boolean;
  mirrorZ: boolean;
};

type BrushPos = { x: number; y: number } | null;

export default abstract class PaintManager {
  private static ctx = new OffscreenCanvas(64, 64).getContext('2d')!;
  private static brushActive = false;
  private static brushPos: BrushPos = null;
  private static lastPos: BrushPos = null;
  private static applying = false;
  private static brush: Brush = {
    color: '#000000',
    opaqueColor: '#000000',
    opacity: 1,
    size: 1,
    type: 'pencil',
    eyedropper: false,
    tolerance: 0,
    continuous: true,
    fillBoundary: 'part',
    mirrorX: false,
    mirrorZ: false
  };

  static brushSpeaker = new Speaker(() => this.getBrush());

  static getBrush = (): Brush => ({ ...this.brush });

  static getBrushPos = (): BrushPos => (this.brushPos ? { ...this.brushPos } : null);

  static updateBrush = (update: Partial<Brush>) => {
    this.brush = { ...this.brush, ...update };
    if (update.color) {
      const rgba = ImgMod.colorAsRgba(this.brush.color);
      this.brush.opaqueColor = ImgMod.rgbaToHex(rgba, false);
      this.brush.opacity = rgba[3] / 255;
    }
    if (update.type && update.eyedropper === undefined) this.brush.eyedropper = false;

    this.updatePreview();
    this.brushSpeaker.updateListeners();
  };

  static setBrushPos = (pos: BrushPos) => {
    if (
      pos === this.brushPos ||
      (pos && this.brushPos && pos.x === this.brushPos.x && pos.y === this.brushPos.y)
    )
      return;

    this.brushPos = pos ? { ...pos } : pos;
    if (!this.brushPos) this.lastPos = null;
    this.updatePreview();
  };

  static setBrushActive = (active: boolean) => {
    if (active === this.brushActive) return;
    this.brushActive = active;
    this.lastPos = null;

    if (this.brush.type === 'bucket' && !this.brush.eyedropper) {
      if (this.brushActive) this.fill();
      return;
    }

    if (this.brushActive) this.updatePreview();
    else this.applyPreview();
  };

  static isBrushActive = () => this.brushActive;

  static updatePreview = () => {
    if (this.applying) return;
    if (!this.brushActive) this.ctx.clearRect(0, 0, 64, 64);

    if (
      this.brushPos &&
      !this.brush.eyedropper &&
      this.brush.type !== 'bucket' &&
      (this.brushActive || this.brush.type !== 'eraser')
    ) {
      const size = this.brush.size;
      const offset = Math.floor(this.brush.size / 2);

      this.ctx.fillStyle = this.brush.opaqueColor;

      if (!this.brushActive || !this.lastPos)
        this.ctx.fillRect(this.brushPos.x - offset, this.brushPos.y - offset, size, size);

      if (this.brushActive) {
        if (
          this.lastPos &&
          !(this.brushPos.x === this.lastPos.x && this.brushPos.y === this.lastPos.y)
        ) {
          const dx = this.brushPos.x - this.lastPos.x;
          const dy = this.brushPos.y - this.lastPos.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const nx = dx / length;
          const ny = dy / length;

          let previous = this.lastPos;
          for (let i = 1; this.brushPos.x !== previous.x || this.brushPos.y !== previous.y; i++) {
            const next = {
              x: Math.round(this.lastPos.x + nx * i),
              y: Math.round(this.lastPos.y + ny * i)
            };

            if (next.x === previous.x && next.y === previous.y) continue;
            this.ctx.fillRect(next.x - offset, next.y - offset, size, size);
            previous = next;
          }
        }

        this.lastPos = { ...this.brushPos };
      }
    }

    const selected = SkinManager.getSelected();
    const preview = selected instanceof ImgMod.Img && selected.preview;
    if (!preview) return;

    preview.image = Mirrors.mirrorImage(
      this.ctx.canvas.transferToImageBitmap(),
      SkinManager.getSlim(),
      this.brush.mirrorX,
      this.brush.mirrorZ
    );
    if (this.brushActive) this.ctx.drawImage(preview.image, 0, 0);

    preview.type(this.brush.type === 'eraser' ? 'erase' : 'normal');
    preview.opacity = this.brush.opacity;
    SkinManager.updateSkin();
  };

  static fill = () => {
    if (this.applying || !this.brushPos) return;

    const selected = SkinManager.getSelected();
    if (!(selected instanceof ImgMod.Img)) return;

    const boundaries =
      this.brush.fillBoundary === 'none'
        ? [{ x1: 0, y1: 0, x2: 64, y2: 64 }]
        : Boundaries.getBoundaries(
            this.brushPos.x,
            this.brushPos.y,
            !!selected.getSlimOverride(SkinManager.getSlim()),
            this.brush.fillBoundary === 'face'
          );
    if (!boundaries) return;

    const selectedData = selected.getImageData()?.data;

    const imageData = this.ctx.getImageData(0, 0, 64, 64);
    const data = imageData.data;
    const rgba = ImgMod.colorAsRgba(this.brush.color);

    const selectedRgba = (index: number): ImgMod.Rgba =>
      selectedData
        ? [
            selectedData[index],
            selectedData[index + 1],
            selectedData[index + 2],
            selectedData[index + 3]
          ]
        : [0, 0, 0, 0];
    const startRgba = selectedRgba((this.brushPos.x + this.brushPos.y * 64) * 4);

    if (this.brush.continuous && this.brush.tolerance < 1) {
      const indices = new Set([] as number[]);

      // this should probably wrap around 3D space
      const floodFill = (x: number, y: number) => {
        const index = (x + y * 64) * 4;
        if (indices.has(index)) return;
        indices.add(index);

        if (!Boundaries.checkBoundarySet(x, y, boundaries)) return;
        const difference = ImgMod.compareRgba(startRgba, selectedRgba(index));
        if (difference > this.brush.tolerance) return;

        data[index] = rgba[0];
        data[index + 1] = rgba[1];
        data[index + 2] = rgba[2];
        data[index + 3] = 255;

        if (x > 0) floodFill(x - 1, y);
        if (x < 63) floodFill(x + 1, y);
        if (y > 0) floodFill(x, y - 1);
        if (y < 63) floodFill(x, y + 1);
      };

      floodFill(this.brushPos.x, this.brushPos.y);
    } else
      for (const { x1, y1, x2, y2 } of boundaries)
        for (let x = x1; x < x2; x++)
          for (let y = y1; y < y2; y++) {
            const index = (x + y * 64) * 4;
            if (this.brush.tolerance < 1) {
              const difference = ImgMod.compareRgba(startRgba, selectedRgba(index));
              if (difference > this.brush.tolerance) continue;
            }
            data[index] = rgba[0];
            data[index + 1] = rgba[1];
            data[index + 2] = rgba[2];
            data[index + 3] = 255;
          }

    this.ctx.putImageData(imageData, 0, 0);

    this.applyPreview();
  };

  static applyPreview: () => void = async () => {
    if (this.applying) return;
    this.applying = true;

    const selected = SkinManager.getSelected();
    const preview = selected instanceof ImgMod.Img && selected.preview;
    if (!selected || !preview || !(selected instanceof ImgMod.Img)) {
      this.ctx.clearRect(0, 0, 64, 64);
      this.applying = false;
      return;
    }

    const stroke = this.ctx.canvas.transferToImageBitmap();

    if (selected.rawImage) this.ctx.drawImage(selected.rawImage, 0, 0);
    if (this.brush.type === 'eraser') this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.globalAlpha = this.brush.opacity;
    this.ctx.drawImage(stroke, 0, 0);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;

    const before = await selected.getImageBlobSrc(selected.rawImage);
    await selected.setImage(this.ctx.canvas.transferToImageBitmap());
    const after = await selected.getImageBlobSrc(selected.rawImage);

    preview.image = this.ctx.canvas.transferToImageBitmap();
    preview.markChanged(true);

    SkinManager.updateSkin();
    EditManager.addEdit('brush stroke', async () => await this.strokeUndo(selected, before, after));

    this.applying = false;
  };

  static strokeUndo = async (img: ImgMod.Img, before?: string, after?: string) => {
    await img.loadUrl(before ?? ImgMod.EMPTY_IMAGE_SOURCE);
    SkinManager.updateSkin();
    return () => this.strokeUndo(img, after, before);
  };

  static getRgba = (x: number, y: number, focus: boolean) =>
    (focus ? SkinManager.getSelected() : SkinManager.getRoot())?.getPixelColor(x, y) ?? [
      0, 0, 0, 0
    ];

  static pickColor = (focus: boolean) => {
    if (!this.brushPos) return;

    const rgba = this.getRgba(this.brushPos.x, this.brushPos.y, focus);
    if (!rgba) return;

    this.updateBrush({
      color: ImgMod.rgbaToHex(rgba),
      eyedropper: false
    });
  };
}

export function useBrush() {
  const [brush, setBrush] = useState(PaintManager.getBrush());

  PaintManager.brushSpeaker.registerListener(setBrush);
  useEffect(() => {
    PaintManager.brushSpeaker.registerListener(setBrush);
    return () => PaintManager.brushSpeaker.unregisterListener(setBrush);
  }, [brush]);

  return brush;
}
