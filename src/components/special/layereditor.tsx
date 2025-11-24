import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import PropertiesList, { Property } from '@components/basic/propertieslist';
import PaintManager, { BRUSH_TYPES, FILL_BOUNDARIES, useBrush } from '@tools/painting/paintman';
import SkinManager, { useSelected, useSkin } from '@tools/skinman';
import checkerboard from '@assets/checkerboard.png';
import fullref from '@assets/fullref.png';
import slimref from '@assets/slimref.png';
import { ERASER, EYEDROPPER, PAINT_BUCKET, PENCIL } from '@components/svgs';
import { usePalette } from '@tools/painting/paletteman';

type AProps = {
  colorPalette: boolean;
  toggleColorPalette: () => void;
};

export default function LayerEditor(props: AProps) {
  const selected = useSelected();
  const brush = useBrush();
  const palette = usePalette();
  const skin = useSkin();

  const canvasRef = useRef(null as HTMLCanvasElement | null);
  const overlayRef = useRef(null as HTMLCanvasElement | null);
  const [guide, setGuide] = useState(false);
  const [grid, setGrid] = useState(true);
  const [gridSize, setGridSize] = useState(3);
  const [focus, setFocus] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, zoom: Math.log(100) });
  const panPos = useRef(null as { x: number; y: number; tx: number; ty: number } | null);

  // (512 / 100) / 64 = 0.08
  const getCanvasSize = (zoom: number) => Math.round(Math.exp(zoom) * 0.08) * 64;

  useLayoutEffect(() => {
    const pan = (e: MouseEvent) => {
      if (!panPos.current) return;

      setTransform({
        ...transform,
        x: transform.x + e.movementX * 2,
        y: transform.y + e.movementY * 2
      });
    };

    document.addEventListener('mousemove', pan);
    return () => document.removeEventListener('mousemove', pan);
  });

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, 64, 64);

      if (skin.image && !focus) ctx.drawImage(skin.image, 0, 0);
      else {
        if (selected?.image) ctx.drawImage(selected.image, 0, 0);
        if (selected instanceof ImgMod.Img && selected.preview?.image) {
          if (brush.type === 'eraser') ctx.globalCompositeOperation = 'destination-out';
          ctx.globalAlpha = palette.alpha;
          ctx.drawImage(selected.preview.image, 0, 0);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        }
      }
    }

    if (overlayRef.current) {
      const ctx = overlayRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      const pos = PaintManager.getBrushPos();
      if (pos && (brush.type === 'eraser' || brush.eyedropper)) {
        const scale = ctx.canvas.width / 64;
        const size = brush.eyedropper ? 1 : brush.size;

        const left = Math.round(pos.x - size / 2);
        const top = Math.round(pos.y - size / 2);

        const outlineNum = Math.max(4 * size - 4, 1);
        for (let i = 0; i < outlineNum; i++) {
          let [x, y] = [0, 0];

          if (outlineNum !== 1)
            switch (Math.floor(i / (size - 1))) {
              case 0:
                [x, y] = [i, 0];
                break;
              case 1:
                [x, y] = [size - 1, i - size + 1];
                break;
              case 2:
                [x, y] = [i - 2 * size + 3, size - 1];
                break;
              case 3:
                [x, y] = [0, i - 3 * size + 4];
                break;
            }

          const rgba = PaintManager.getRgba(left + x, top + y, focus);
          const white = 255 - rgba[3];
          const combined: ImgMod.Rgba = [rgba[0] + white, rgba[1] + white, rgba[2] + white, 255];
          const grayPos = [combined[0] - 127, combined[1] - 127, combined[2] - 127];
          const graySqr =
            grayPos[0] * grayPos[0] + grayPos[1] * grayPos[1] + grayPos[2] * grayPos[2];

          ctx.fillStyle = graySqr < 8192 ? 'black' : ImgMod.rgbaToHex(ImgMod.invertRgba(combined));

          const sx = (left + x) * scale;
          const sy = (top + y) * scale;

          if (x === 0) ctx.fillRect(sx, sy, 1, scale);
          if (x === size - 1) ctx.fillRect(sx + scale - 1, sy, 1, scale);
          if (y === 0) ctx.fillRect(sx, sy, scale, 1);
          if (y === size - 1) ctx.fillRect(sx, sy + scale - 1, scale, 1);
        }
      }
    }
  }, [skin.image, selected, brush, focus, transform.zoom, palette.alpha]);

  useEffect(() => {
    const area = canvasRef.current?.parentElement?.parentElement;

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
        panPos.current = null;
        const rect = area?.getBoundingClientRect();
        if (
          rect &&
          (e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom)
        )
          PaintManager.setBrushPos(null);
      } else if (e.button === 0) PaintManager.setBrushActive(false);
    };

    const pan = (e: MouseEvent) => {
      if (!panPos.current) return;

      setTransform({
        ...transform,
        x: panPos.current.tx + (e.screenX - panPos.current.x) * 2,
        y: panPos.current.ty + (e.screenY - panPos.current.y) * 2
      });
    };

    const shortcuts = (e: KeyboardEvent) => {
      if (!canvasRef.current?.closest('.window')?.classList.contains('active')) return;

      const key = e.key.toUpperCase();
      if (key === 'B') PaintManager.updateBrush({ type: 'pencil' });
      else if (key === 'E') PaintManager.updateBrush({ type: 'eraser' });
      else if (key === 'I') PaintManager.updateBrush({ eyedropper: !brush.eyedropper });
      else if (key === 'G') PaintManager.updateBrush({ type: 'bucket' });
    };

    const onWheel = (e: WheelEvent) => {
      if (!canvasRef.current) return;

      if (e.ctrlKey) {
        const change = e.deltaY < 0 ? 1 : -1;
        const size = Util.clamp(brush.size + change, 1, 16);

        if (size !== brush.size) PaintManager.updateBrush({ size: size });

        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const zoom = Util.clamp(transform.zoom - e.deltaY / 500, 3, 7);

      const rect = canvasRef.current.getBoundingClientRect();
      const delta = rect.width - getCanvasSize(zoom);

      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      const tx = Math.round(transform.x + delta * x);
      const ty = Math.round(transform.y + delta * y);

      if (panPos.current) panPos.current = { x: e.screenX, y: e.screenY, tx: tx, ty: ty };

      setTransform({
        x: tx,
        y: ty,
        zoom: zoom
      });
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', pan);
    document.addEventListener('keydown', shortcuts);
    area?.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', pan);
      document.removeEventListener('keydown', shortcuts);
      area?.removeEventListener('wheel', onWheel);
    };
  });

  function onMouseMove(e: React.MouseEvent) {
    if (!canvasRef.current) return;
    if (panPos.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const brushPos = {
      x: Math.floor(((e.clientX - rect.left) / (rect.right - rect.left)) * canvasRef.current.width),
      y: Math.floor(((e.clientY - rect.top) / (rect.bottom - rect.top)) * canvasRef.current.height)
    };

    if (!focus && selected instanceof ImgMod.Img) {
      PaintManager.setBrushPos(selected.getFormPos(brushPos.x, brushPos.y, SkinManager.getSlim()));
      return;
    }

    PaintManager.setBrushPos(brushPos);
  }

  const canvasSize = `${getCanvasSize(transform.zoom)}px`;
  const overlaySize = Math.max(Math.round(Math.exp(transform.zoom) * 0.01), 1) * 128;
  const slim =
    focus && selected instanceof ImgMod.Img
      ? selected.getSlimOverride(SkinManager.getSlim())
      : SkinManager.getSlim();

  const toolProperties: Property[] = [
    {
      name: 'Color Palette',
      id: 'palette',
      type: 'button',
      label: 'palette',
      unlabeled: true,
      isIcon: true,
      selected: props.colorPalette,
      onClick: props.toggleColorPalette
    }
  ];

  if (brush.type === 'bucket')
    toolProperties.push(
      {
        name: 'Tolerance',
        id: 'tolerance',
        type: 'range',
        value: 100 * brush.tolerance,
        subtype: 'percent',
        min: 0,
        max: 100,
        step: 1,
        onChange: value => PaintManager.updateBrush({ tolerance: value / 100 })
      },
      {
        name: 'Continuous',
        id: 'continuous',
        type: 'checkbox',
        value: brush.continuous,
        onChange: value => PaintManager.updateBrush({ continuous: value })
      },
      {
        name: 'Fill Boundary',
        id: 'fillBoundary',
        type: 'button',
        label: brush.fillBoundary,
        onClick: () =>
          PaintManager.updateBrush({
            fillBoundary:
              FILL_BOUNDARIES[
                (FILL_BOUNDARIES.indexOf(brush.fillBoundary) + 1) % FILL_BOUNDARIES.length
              ]
          })
      }
    );
  else
    toolProperties.push({
      name: 'Size',
      id: 'brushSize',
      type: 'range',
      step: 1,
      min: 1,
      max: 16,
      value: brush.size,
      onChange: value => PaintManager.updateBrush({ size: value })
    });

  toolProperties.push({
    name: 'Mirror',
    type: 'divider',
    id: 'mirrorDivider',
    siblings: [
      {
        name: 'X',
        id: 'mirrorX',
        type: 'button',
        selected: brush.mirrorX,
        onClick: () => PaintManager.updateBrush({ mirrorX: !brush.mirrorX })
      },
      {
        name: 'Z',
        id: 'mirrorZ',
        type: 'button',
        selected: brush.mirrorZ,
        onClick: () => PaintManager.updateBrush({ mirrorZ: !brush.mirrorZ })
      }
    ]
  });

  return (
    <div className="container">
      <div className="layer-editor">
        <p>{selected?.name ?? 'No layer selected.'}</p>
        <div>
          <PropertiesList
            type="ribbon"
            properties={[
              {
                name: 'Guide',
                id: 'guide',
                type: 'checkbox',
                value: guide,
                onChange: setGuide
              },
              {
                name: 'Grid',
                id: 'grid',
                type: 'checkbox',
                value: grid,
                onChange: setGrid,
                siblings: [
                  {
                    name: 'Grid Size',
                    id: 'gridSize',
                    type: 'range',
                    step: 1,
                    min: 0,
                    max: 5,
                    value: gridSize,
                    onChange: setGridSize
                  }
                ]
              },
              {
                name: 'Focus Layer',
                id: 'focus',
                type: 'checkbox',
                value: focus,
                onChange: setFocus
              },
              {
                name: 'Recenter',
                id: 'recenter',
                type: 'button',
                label: 'recenter',
                unlabeled: true,
                isIcon: true,
                onClick: () => setTransform({ ...transform, x: 0, y: 0 })
              }
            ]}
          />
          <PropertiesList type="ribbon" properties={toolProperties} />
        </div>
        <div className="top left">
          <PropertiesList
            type="toolbar"
            buttonFallback={id =>
              Util.includes(BRUSH_TYPES, id) && PaintManager.updateBrush({ type: id })
            }
            properties={[
              {
                name: 'Pencil (B)',
                label: PENCIL,
                id: 'pencil',
                type: 'button',
                selected: !brush.eyedropper && brush.type === 'pencil'
              },
              {
                name: 'Eraser (E)',
                label: ERASER,
                id: 'eraser',
                type: 'button',
                selected: !brush.eyedropper && brush.type === 'eraser'
              },
              {
                name: 'Eyedropper (I)',
                label: EYEDROPPER,
                id: 'eyedropper',
                type: 'button',
                selected: brush.eyedropper,
                onClick: () => PaintManager.updateBrush({ eyedropper: !brush.eyedropper })
              },
              {
                name: 'Paint Bucket (G)',
                label: PAINT_BUCKET,
                id: 'bucket',
                type: 'button',
                selected: !brush.eyedropper && brush.type === 'bucket'
              }
            ]}
          />
        </div>
        <div
          className="layer-editor-canvas-area"
          onContextMenu={e => e.preventDefault()}
          onMouseMove={onMouseMove}
          onMouseDown={e =>
            (e.button === 2 || (e.button === 0 && e.shiftKey)) &&
            (panPos.current = { x: e.screenX, y: e.screenY, tx: transform.x, ty: transform.y })
          }
          onMouseLeave={() => !panPos.current && PaintManager.setBrushPos(null)}
        >
          <div
            className="layer-editor-canvases"
            onMouseDown={e =>
              e.button === 0 &&
              !e.shiftKey &&
              (brush.eyedropper ? PaintManager.pickColor(focus) : PaintManager.setBrushActive(true))
            }
            style={{
              cursor:
                selected instanceof ImgMod.Img && !selected.dynamic ? undefined : 'not-allowed',
              backgroundImage:
                (guide ? `url(${slim ? slimref : fullref})` : 'none') + `, url(${checkerboard})`,
              backgroundSize: `100%, ${grid ? 100 / Math.pow(2, 5 - gridSize) : 200}%`,
              marginLeft: `${transform.x}px`,
              marginTop: `${transform.y}px`,
              width: canvasSize,
              height: canvasSize
            }}
          >
            <canvas width={64} height={64} ref={canvasRef} />
            <canvas width={overlaySize} height={overlaySize} ref={overlayRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
