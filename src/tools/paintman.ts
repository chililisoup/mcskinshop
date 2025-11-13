import { useEffect, useState } from 'react';
import Speaker from '@tools/speaker';
import SkinManager from './skinman';
import * as ImgMod from '@tools/imgmod';

type Brush = {
  color: string;
  size: number;
  type: 'pencil' | 'eraser';
};

type BrushPos = { x: number; y: number } | null;

export default abstract class PaintManager {
  private static context = new OffscreenCanvas(64, 64).getContext('2d')!;
  private static brushActive = false;
  private static brushPos: BrushPos = null;
  private static brush: Brush = {
    color: '#000000',
    size: 1,
    type: 'pencil'
  };

  static brushSpeaker = new Speaker(() => this.getBrush());

  static getBrush = (): Brush => ({ ...this.brush });

  static updateBrush = (update: Partial<Brush>) => {
    if (update.type && update.type !== this.brush.type) Object.assign(this.brush, update);
    this.applyPreview();
    this.brushSpeaker.updateListeners();
  };

  static setBrushPos = (pos: BrushPos) => {
    if (
      pos === this.brushPos ||
      (pos && this.brushPos && pos.x === this.brushPos.x && pos.y === this.brushPos.y)
    )
      return;

    this.brushPos = pos ? { ...pos } : pos;
    this.updatePreview();
  };

  static setBrushActive = (active: boolean) => {
    if (active === this.brushActive) return;
    this.brushActive = active;

    if (this.brushActive) this.updatePreview();
    else this.applyPreview();
  };

  static updatePreview = () => {
    if (!this.brushActive) this.context.clearRect(0, 0, 64, 64);

    if (this.brushPos && this.brush.type !== 'eraser') {
      this.context.fillStyle = this.brush.color;
      this.context.fillRect(this.brushPos.x, this.brushPos.y, 1, 1);
    }

    const preview = SkinManager.getSelected().preview;
    if (!preview) return;

    preview.image = this.context.canvas.transferToImageBitmap();
    if (this.brushActive) this.context.drawImage(preview.image, 0, 0);

    preview.markChanged();
    SkinManager.updateSkin();
  };

  static applyPreview: () => void = async () => {
    const { layer, preview } = SkinManager.getSelected();
    if (!layer || !preview || !(layer instanceof ImgMod.Img)) {
      this.context.clearRect(0, 0, 64, 64);
      return;
    }

    const stroke = this.context.canvas.transferToImageBitmap();

    if (layer.rawImage) this.context.drawImage(layer.rawImage, 0, 0);
    this.context.drawImage(stroke, 0, 0);

    await layer.setImage(this.context.canvas.transferToImageBitmap());

    preview.image = this.context.canvas.transferToImageBitmap();
    preview.markChanged();

    SkinManager.updateSkin();
  };
}

export function useBrush() {
  const [brush, setBrush] = useState(PaintManager.getBrush());

  useEffect(() => {
    PaintManager.brushSpeaker.registerListener(setBrush);
    return () => PaintManager.brushSpeaker.unregisterListener(setBrush);
  }, [brush]);

  return brush;
}
