import React, { useEffect, useRef, useState } from 'react';
import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import PropertiesList from '@components/basic/propertieslist';
import PaintManager, { BRUSH_TYPES, useBrush } from '@tools/paintman';
import SkinManager, { useSelected, useSkin } from '@tools/skinman';
import checkerboard from '@assets/checkerboard.png';
import fullref from '@assets/fullref.png';
import slimref from '@assets/slimref.png';
import { ERASER, PENCIL } from '@components/svgs';

export default function LayerEditor() {
  const selected = useSelected();
  const brush = useBrush();
  const skin = useSkin();

  const canvasRef = useRef(null as HTMLCanvasElement | null);
  const [guide, setGuide] = useState(false);
  const [grid, setGrid] = useState(true);
  const [gridSize, setGridSize] = useState(3);
  const [focus, setFocus] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, zoom: Math.log(100) });
  const panning = useRef(false);

  // (512 / 100) / 64 = 0.08
  const getCanvasSize = (zoom: number) => Math.round(Math.exp(zoom) * 0.08) * 64;

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, 64, 64);

      if (focus) {
        if (selected.layer?.image) ctx.drawImage(selected.layer.image, 0, 0);
        if (selected.preview?.image) {
          if (brush.type === 'eraser') ctx.globalCompositeOperation = 'destination-out';
          ctx.drawImage(selected.preview.image, 0, 0);
          ctx.globalCompositeOperation = 'source-over';
        }
      } else if (skin.image) ctx.drawImage(skin.image, 0, 0);
    }

    const endPan = (e: MouseEvent) => e.button === 2 && (panning.current = false);

    const pan = (e: MouseEvent) => {
      if (!panning.current) return;

      setTransform({
        ...transform,
        x: transform.x + e.movementX * 2,
        y: transform.y + e.movementY * 2
      });
    };

    const shortcuts = (e: KeyboardEvent) => {
      if (!canvasRef.current?.closest('.window')?.classList.contains('active')) return;

      const key = e.key.toUpperCase();
      if (key === 'B') PaintManager.updateBrush({ type: 'pencil' });
      else if (key === 'E') PaintManager.updateBrush({ type: 'eraser' });
    };

    document.addEventListener('mouseup', endPan);
    document.addEventListener('mousemove', pan);
    document.addEventListener('keydown', shortcuts);
    return () => {
      document.removeEventListener('mouseup', endPan);
      document.removeEventListener('mousemove', pan);
      document.removeEventListener('keydown', shortcuts);
    };
  });

  function onWheel(e: React.WheelEvent) {
    if (!canvasRef.current) return;

    const zoom = Util.clamp(transform.zoom - e.deltaY / 500, 3, 7);

    const rect = canvasRef.current.getBoundingClientRect();
    const delta = rect.width - getCanvasSize(zoom);

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    setTransform({
      x: Math.round(transform.x + delta * x),
      y: Math.round(transform.y + delta * y),
      zoom: zoom
    });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const brushPos = {
      x: Math.floor(((e.clientX - rect.left) / (rect.right - rect.left)) * canvasRef.current.width),
      y: Math.floor(((e.clientY - rect.top) / (rect.bottom - rect.top)) * canvasRef.current.height)
    };

    PaintManager.setBrushPos(brushPos);
  }

  function onMouseLeave() {
    PaintManager.setBrushPos(null);
    PaintManager.setBrushActive(false);
  }

  const canvasSize = `${getCanvasSize(transform.zoom)}px`;

  return (
    <div className="container">
      <div className="layer-editor">
        <p>{selected.layer?.name ?? 'No layer selected.'}</p>
        <PropertiesList
          type="ribbon"
          properties={[
            {
              name: 'Brush Color',
              id: 'brushColor',
              type: 'color',
              value: brush.color,
              unlabeled: true,
              controlled: true,
              onChange: value => PaintManager.updateBrush({ color: value })
            },
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
        <div className="top left">
          <PropertiesList
            type="toolbar"
            buttonFallback={id =>
              Util.includes(BRUSH_TYPES, id) && PaintManager.updateBrush({ type: id })
            }
            properties={[
              {
                name: 'Pencil',
                label: PENCIL,
                id: 'pencil',
                type: 'button',
                selected: brush.type === 'pencil'
              },
              {
                name: 'Eraser',
                label: ERASER,
                id: 'eraser',
                type: 'button',
                selected: brush.type === 'eraser'
              }
            ]}
          />
        </div>
        <div
          className="layer-editor-canvas-area"
          onContextMenu={e => e.preventDefault()}
          onWheel={onWheel}
          onMouseDown={e => e.button === 2 && (panning.current = true)}
        >
          <canvas
            className="layer-editor-canvas"
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onMouseDown={e => e.button === 0 && PaintManager.setBrushActive(true)}
            onMouseUp={e => e.button === 0 && PaintManager.setBrushActive(false)}
            width={64}
            height={64}
            style={{
              cursor:
                selected.layer instanceof ImgMod.Img && !selected.layer.dynamic
                  ? undefined
                  : 'not-allowed',
              backgroundImage:
                (guide ? `url(${SkinManager.getSlim() ? slimref : fullref})` : 'none') +
                `, url(${checkerboard})`,
              backgroundSize: `100%, ${grid ? 100 / Math.pow(2, 5 - gridSize) : 200}%`,
              marginLeft: `${transform.x}px`,
              marginTop: `${transform.y}px`,
              width: canvasSize,
              height: canvasSize
            }}
            ref={canvasRef}
          />
        </div>
      </div>
    </div>
  );
}
