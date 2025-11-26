import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import PropertiesList, { Property } from '@components/basic/propertieslist';
import PaintManager, {
  BRUSH_TYPES,
  FILL_BOUNDARIES,
  Space,
  useBrush
} from '@tools/painting/paintman';
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

type CanvasTransform = {
  x: number;
  y: number;
  zoom: number;
};

const absentName = 'No layer selected.';

const currentlyEditable = (
  layer: ImgMod.AbstractLayer | null,
  focus: boolean
): layer is ImgMod.Img =>
  layer instanceof ImgMod.Img && !layer.dynamic && (focus || layer.active());

export default function LayerEditor(props: AProps) {
  const selected = useSelected();
  const brush = useBrush();
  const palette = usePalette();
  const skin = useSkin();

  const canvasRef = useRef(null as HTMLCanvasElement | null);
  const overlayRef = useRef(null as HTMLCanvasElement | null);
  const [name, setName] = useState(absentName);
  const [guide, setGuide] = useState(false);
  const [grid, setGrid] = useState(true);
  const [gridSize, setGridSize] = useState(3);
  const [focus, setFocus] = useState(false);
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    zoom: Math.log(100)
  } as CanvasTransform);
  const panPos = useRef(null as { x: number; y: number; tx: number; ty: number } | null);

  const updateTransform = useCallback(
    (update: Partial<CanvasTransform>) => setTransform(transform => ({ ...transform, ...update })),
    []
  );

  // (512 / 100) / 64 = 0.08
  const getCanvasSize = (zoom: number) => Math.round(Math.exp(zoom) * 0.08) * 64;

  useEffect(() => {
    setName(selected?.name() ?? absentName);
    if (!selected) return;

    const onUpdate = (update: ImgMod.SpeakerUpdate) =>
      update.markers.includes(ImgMod.ChangeMarker.Info) && setName(update.info.name);

    selected.speaker().registerListener(onUpdate);
    return () => selected.speaker().unregisterListener(onUpdate);
  }, [selected]);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, 64, 64);

      if (skin.image && !focus) ctx.drawImage(skin.image, 0, 0);
      else {
        if (selected?.image) ctx.drawImage(selected.image, 0, 0);
        if (currentlyEditable(selected, focus) && selected.preview?.image) {
          if (brush.type === 'eraser') ctx.globalCompositeOperation = 'destination-out';
          ctx.globalAlpha = palette.alpha;
          ctx.drawImage(selected.preview.image, 0, 0);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        }
      }
    }
  }, [brush.type, focus, palette.alpha, selected, skin.image]);

  useEffect(() => {
    if (overlayRef.current) {
      const ctx = new OffscreenCanvas(
        overlayRef.current.width,
        overlayRef.current.height
      ).getContext('2d')!;

      const overlayCtx = overlayRef.current.getContext('2d')!;
      overlayCtx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      const pos = brush.pos;
      if (pos && (brush.type === 'eraser' || brush.eyedropper)) {
        const scale = ctx.canvas.width / 64;
        const size = brush.eyedropper ? 1 : brush.size;

        const left = Math.round(pos.x - size / 2);
        const top = Math.round(pos.y - size / 2);

        const outlineNum = Math.max(4 * size - 4, 1);

        const imageDataArray = (
          focus ? SkinManager.getSelected() : SkinManager.getRoot()
        )?.getImageDataArray();

        const getRgba: (x: number, y: number) => ImgMod.Rgba = imageDataArray
          ? (x, y) => {
              const pixelIndex = (x + y * 64) * 4;
              return [
                imageDataArray[pixelIndex],
                imageDataArray[pixelIndex + 1],
                imageDataArray[pixelIndex + 2],
                imageDataArray[pixelIndex + 3]
              ];
            }
          : () => [0, 0, 0, 255];

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

          const rgba = getRgba(left + x, top + y);
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

        overlayCtx.drawImage(ctx.canvas, 0, 0);
      }
    }
  }, [brush, focus]);

  useEffect(() => {
    const area = canvasRef.current?.parentElement?.parentElement;

    const onPointerUp = (e: PointerEvent) => {
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
          PaintManager.setBrushPos(null, Space.TwoD);
      } else if (e.button === 0) PaintManager.setBrushActive(false);
    };

    const pan = (e: PointerEvent) => {
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

    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointermove', pan);
    document.addEventListener('keydown', shortcuts);
    area?.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointermove', pan);
      document.removeEventListener('keydown', shortcuts);
      area?.removeEventListener('wheel', onWheel);
    };
  });

  function onPointerMove(e: React.PointerEvent) {
    if (!canvasRef.current) return;
    if (panPos.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const brushPos = {
      x: Math.floor(((e.clientX - rect.left) / (rect.right - rect.left)) * canvasRef.current.width),
      y: Math.floor(((e.clientY - rect.top) / (rect.bottom - rect.top)) * canvasRef.current.height)
    };

    if (!focus && selected instanceof ImgMod.Img) {
      PaintManager.setBrushPos(
        selected.getFormPos(brushPos.x, brushPos.y, SkinManager.getSlim()),
        Space.TwoD
      );
      return;
    }

    PaintManager.setBrushPos(brushPos, Space.TwoD);
  }

  const canvasSize = `${getCanvasSize(transform.zoom)}px`;
  const overlaySize = Math.max(Math.round(Math.exp(transform.zoom) * 0.01), 1) * 128;
  const slim =
    focus && selected instanceof ImgMod.Img
      ? selected.getSlimOverride(SkinManager.getSlim())
      : SkinManager.getSlim();

  return (
    <div className="container">
      <div className="layer-editor">
        <p>{name}</p>
        <LayerEditorRibbon
          {...props}
          guide={guide}
          setGuide={setGuide}
          grid={grid}
          setGrid={setGrid}
          gridSize={gridSize}
          setGridSize={setGridSize}
          focus={focus}
          setFocus={setFocus}
          updateTransform={updateTransform}
        />
        <div className="top left">
          <LayerEditorToolbar />
        </div>
        <div
          className="layer-editor-canvas-area"
          onContextMenu={e => e.preventDefault()}
          onPointerMove={onPointerMove}
          onPointerDown={e =>
            (e.button === 2 || (e.button === 0 && e.shiftKey)) &&
            (panPos.current = { x: e.screenX, y: e.screenY, tx: transform.x, ty: transform.y })
          }
          onPointerLeave={() => !panPos.current && PaintManager.setBrushPos(null, Space.TwoD)}
        >
          <div
            className="layer-editor-canvases"
            onPointerDown={e =>
              e.button === 0 &&
              !e.shiftKey &&
              (brush.eyedropper
                ? PaintManager.pickColor(focus)
                : currentlyEditable(selected, focus) && PaintManager.setBrushActive(true))
            }
            style={{
              cursor: currentlyEditable(selected, focus) ? undefined : 'not-allowed',
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

type BProps = AProps & {
  guide: boolean;
  setGuide: (value: boolean) => void;
  grid: boolean;
  setGrid: (value: boolean) => void;
  gridSize: number;
  setGridSize: (value: number) => void;
  focus: boolean;
  setFocus: (value: boolean) => void;
  updateTransform: (value: Partial<CanvasTransform>) => void;
};

const LayerEditorRibbon = React.memo((props: BProps) => {
  const brush = useBrush();

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
    <div>
      <PropertiesList
        type="ribbon"
        properties={[
          {
            name: 'Guide',
            id: 'guide',
            type: 'checkbox',
            value: props.guide,
            onChange: props.setGuide
          },
          {
            name: 'Grid',
            id: 'grid',
            type: 'checkbox',
            value: props.grid,
            onChange: props.setGrid,
            siblings: [
              {
                name: 'Grid Size',
                id: 'gridSize',
                type: 'range',
                step: 1,
                min: 0,
                max: 5,
                value: props.gridSize,
                onChange: props.setGridSize
              }
            ]
          },
          {
            name: 'Focus Layer',
            id: 'focus',
            type: 'checkbox',
            value: props.focus,
            onChange: props.setFocus
          },
          {
            name: 'Recenter',
            id: 'recenter',
            type: 'button',
            label: 'recenter',
            unlabeled: true,
            isIcon: true,
            onClick: () => props.updateTransform({ x: 0, y: 0 })
          }
        ]}
      />
      <PropertiesList type="ribbon" properties={toolProperties} />
    </div>
  );
});

export const LayerEditorToolbar = React.memo(() => {
  const brush = useBrush();

  return (
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
  );
});
