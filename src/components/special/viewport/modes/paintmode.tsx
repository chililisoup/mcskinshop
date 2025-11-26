import React from 'react';
import * as THREE from 'three';
import * as Util from '@tools/util';
import PropertiesList, { Property } from '@components/basic/propertieslist';
import AbstractMode, { Props } from '@components/special/viewport/modes/abstractmode';
import PaintManager, { FILL_BOUNDARIES, Space, useBrush } from '@tools/painting/paintman';
import { LayerEditorToolbar } from '@components/special/layereditor';

export default class PaintMode extends AbstractMode {
  hoveredIntersection?: THREE.Intersection;

  constructor(props: Props) {
    super(props, 'Paint');
  }

  componentDidMount() {
    super.componentDidMount();
    this.props.instance.loadPose();
    this.props.canvasRef.current?.addEventListener('wheel', this.onWheel, { passive: false });
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.props.canvasRef.current?.removeEventListener('wheel', this.onWheel);
  }

  onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    if (!this.props.instance.canvasRef.current?.closest('.window')?.classList.contains('active'))
      return;

    const oldSize = PaintManager.getBrush().size;
    const change = e.deltaY < 0 ? 1 : -1;
    const size = Util.clamp(oldSize + change, 1, 16);

    if (size !== oldSize) PaintManager.updateBrush({ size: size });

    e.preventDefault();
    e.stopPropagation();
  };

  onPointerDown = (e: PointerEvent) => {
    if (!this.hoveredIntersection || e.button === 2) return;
    if (this.props.instance.activeKeys.has('Shift')) return;

    if (this.props.instance.controls) this.props.instance.controls.enabled = false;

    if (PaintManager.getBrush().eyedropper) PaintManager.pickColor(false);
    else PaintManager.setBrushActive(true);
  };

  onPointerUp = () => {
    if (this.props.instance.controls) this.props.instance.controls.enabled = true;
    PaintManager.setBrushActive(false);
  };

  onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    if (key === 'B') PaintManager.updateBrush({ type: 'pencil' });
    else if (key === 'E') PaintManager.updateBrush({ type: 'eraser' });
    else if (key === 'I')
      PaintManager.updateBrush({ eyedropper: !PaintManager.getBrush().eyedropper });
    else if (key === 'G') PaintManager.updateBrush({ type: 'bucket' });
    else if (key === 'CONTROL' && this.props.instance.controls)
      this.props.instance.controls.enabled = false;
  };

  onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Control' && this.props.instance.controls && !PaintManager.isBrushActive())
      this.props.instance.controls.enabled = true;
  };

  renderFrame = () => {
    if (!this.props.instance.pointer) return;

    this.hoveredIntersection = undefined;

    const intersection = this.props.instance.getFirstVisibleIntersection(
      this.props.instance.raycaster.intersectObject(this.props.instance.doll.root, true)
    );

    if (!intersection?.uv || intersection.object.userData.uniqueMaterial)
      return PaintManager.setBrushPos(null, Space.ThreeD);

    this.hoveredIntersection = intersection;

    PaintManager.setBrushPos(
      {
        x: Math.floor(intersection.uv.x * 64),
        y: Math.floor((1 - intersection.uv.y) * 64)
      },
      Space.ThreeD
    );

    this.props.instance.canvasRef.current?.style.setProperty('cursor', 'crosshair');
  };

  renderRibbon = () => <PaintModeRibbon />;

  renderToolbar = () => <LayerEditorToolbar />;
}

const PaintModeRibbon = React.memo(() => {
  const brush = useBrush();

  const toolProperties: Property[] = [];

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

  return <PropertiesList type="ribbon" properties={toolProperties} />;
});
