import { useEffect, useState } from 'react';
import Speaker from '@tools/speaker';
import SkinManager from './skinman';
import * as ImgMod from '@tools/imgmod';

export const BRUSH_TYPES = ['pencil', 'eraser'] as const;

type Brush = {
  color: string;
  opaqueColor: string;
  opacity: number;
  size: number;
  type: (typeof BRUSH_TYPES)[number];
};

type BrushPos = { x: number; y: number } | null;

export default abstract class PaintManager {
  private static ctx = new OffscreenCanvas(64, 64).getContext('2d')!;
  private static brushActive = false;
  private static brushPos: BrushPos = null;
  private static lastPos: BrushPos = null;
  private static brush: Brush = {
    color: '#000000',
    opaqueColor: '#000000',
    opacity: 1,
    size: 1,
    type: 'pencil'
  };

  static brushSpeaker = new Speaker(() => this.getBrush());

  static getBrush = (): Brush => ({ ...this.brush });

  static updateBrush = (update: Partial<Brush>) => {
    this.brush = { ...this.brush, ...update };
    if (update.color) {
      const rgba = ImgMod.colorAsRgba(this.brush.color);
      this.brush.opaqueColor = ImgMod.rgbaToHex(rgba, false);
      this.brush.opacity = rgba[3] / 255;
    }

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

    if (this.brushActive) this.updatePreview();
    else this.applyPreview();
  };

  static updatePreview = () => {
    if (!this.brushActive) this.ctx.clearRect(0, 0, 64, 64);

    if (this.brushPos) {
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

    const preview = SkinManager.getSelected().preview;
    if (!preview) return;

    preview.image = this.ctx.canvas.transferToImageBitmap();
    if (this.brushActive) this.ctx.drawImage(preview.image, 0, 0);

    preview.type(this.brush.type === 'eraser' ? 'erase' : 'normal');
    preview.opacity = this.brush.opacity;
    preview.markChanged();
    SkinManager.updateSkin();
  };

  static applyPreview: () => void = async () => {
    const { layer, preview } = SkinManager.getSelected();
    if (!layer || !preview || !(layer instanceof ImgMod.Img)) {
      this.ctx.clearRect(0, 0, 64, 64);
      return;
    }

    const stroke = this.ctx.canvas.transferToImageBitmap();

    if (layer.rawImage) this.ctx.drawImage(layer.rawImage, 0, 0);
    if (this.brush.type === 'eraser') this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.globalAlpha = this.brush.opacity;
    this.ctx.drawImage(stroke, 0, 0);
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;

    await layer.setImage(this.ctx.canvas.transferToImageBitmap());

    preview.image = this.ctx.canvas.transferToImageBitmap();
    preview.markChanged();

    SkinManager.updateSkin();
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
