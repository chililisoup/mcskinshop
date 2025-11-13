import React, { useEffect, useRef, useState } from 'react';
import * as ImgMod from '@tools/imgmod';
import PropertiesList from '@components/basic/propertieslist';
import PaintManager, { useBrush } from '@tools/paintman';
import SkinManager, { useSelected, useSkin } from '@tools/skinman';
import checkerboard from '@assets/checkerboard.png';
import fullref from '@assets/fullref.png';
import slimref from '@assets/slimref.png';

export default function LayerEditor() {
  const selected = useSelected();
  const brush = useBrush();
  const skin = useSkin();

  const canvasRef = useRef(null as HTMLCanvasElement | null);
  const [guide, setGuide] = useState(false);
  const [grid, setGrid] = useState(true);
  const [gridSize, setGridSize] = useState(3);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, 64, 64);

      if (focus) {
        if (selected.layer?.image) ctx.drawImage(selected.layer.image, 0, 0);
        if (selected.preview?.image) ctx.drawImage(selected.preview.image, 0, 0);
      } else if (skin.image) ctx.drawImage(skin.image, 0, 0);
    }
  });

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
              onChange: (value, finished) => {
                if (finished) PaintManager.updateBrush({ color: value });
              }
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
            }
          ]}
        />
        <div className="layer-editor-canvas-area">
          <canvas
            className="layer-editor-canvas"
            onContextMenu={e => e.preventDefault()}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onMouseDown={() => PaintManager.setBrushActive(true)}
            onMouseUp={() => PaintManager.setBrushActive(false)}
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
              backgroundSize: `100%, ${grid ? 100 / Math.pow(2, 5 - gridSize) : 200}%`
            }}
            ref={canvasRef}
          />
        </div>
      </div>
    </div>
  );
}
