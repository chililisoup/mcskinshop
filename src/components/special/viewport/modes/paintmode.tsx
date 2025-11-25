import React from 'react';
import * as THREE from 'three';
import PropertiesList, { Property } from '@components/basic/propertieslist';
import AbstractMode, { Props } from '@components/special/viewport/modes/abstractmode';
import PaintManager, { FILL_BOUNDARIES, useBrush } from '@tools/painting/paintman';
import { LayerEditorToolbar } from '@components/special/layereditor';

export default class PaintMode extends AbstractMode {
  mousePos = new THREE.Vector2(1, 1); // this should be brought up for use here and in pose mode
  mouseOver = false;
  hoveredIntersection?: THREE.Intersection;

  constructor(props: Props) {
    super(props, 'Paint');
  }

  componentDidMount() {
    super.componentDidMount();

    this.props.instance.loadPose();
    this.props.instance.clearSavedPose();

    if (this.props.canvasRef.current) this.addEvents(this.props.canvasRef.current);
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    this.props.instance.savePose();
    this.props.instance.resetPose();

    if (this.props.canvasRef.current) this.removeEvents(this.props.canvasRef.current);
  }

  addEvents = (canvas: HTMLCanvasElement) => {
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseLeave);
  };

  removeEvents = (canvas: HTMLCanvasElement) => {
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('mouseleave', this.onMouseLeave);
  };

  onMouseMove = (e: MouseEvent) => {
    if (
      this.props.instance.state.mode !== this ||
      !this.props.canvasRef.current?.parentNode ||
      !(this.props.canvasRef.current.parentNode instanceof Element)
    )
      return;

    const width = this.props.canvasRef.current.parentNode.clientWidth;
    const height = this.props.canvasRef.current.parentNode.clientHeight;

    this.mousePos.x = (e.offsetX / width) * 2 - 1;
    this.mousePos.y = (e.offsetY / height) * -2 + 1;

    this.mouseOver = true;
  };

  onMouseDown = (e: MouseEvent) => {
    if (this.props.instance.state.mode !== this) return;
    if (!this.hoveredIntersection || e.button === 2) return;

    if (this.props.instance.controls) this.props.instance.controls.enabled = false;

    if (PaintManager.getBrush().eyedropper) PaintManager.pickColor(false);
    else PaintManager.setBrushActive(true);
  };

  onMouseUp = () => {
    if (this.props.instance.controls) this.props.instance.controls.enabled = true;
    PaintManager.setBrushActive(false);
  };

  onMouseLeave = () => {
    this.mouseOver = false;
  };

  onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toUpperCase();
    if (key === 'B') PaintManager.updateBrush({ type: 'pencil' });
    else if (key === 'E') PaintManager.updateBrush({ type: 'eraser' });
    else if (key === 'I')
      PaintManager.updateBrush({ eyedropper: !PaintManager.getBrush().eyedropper });
    else if (key === 'G') PaintManager.updateBrush({ type: 'bucket' });
  };

  renderFrame = () => {
    if (!this.props.instance.activeCam) return;
    if (!this.mouseOver) return;

    this.props.instance.raycaster.setFromCamera(this.mousePos, this.props.instance.activeCam);

    this.hoveredIntersection = undefined;

    const intersection = this.props.instance.getFirstVisibleIntersection(
      this.props.instance.raycaster.intersectObject(this.props.instance.doll.root, true)
    );

    if (!intersection?.uv || intersection.object.userData.uniqueMaterial)
      return PaintManager.setBrushPos(null);

    this.hoveredIntersection = intersection;

    PaintManager.setBrushPos({
      x: Math.floor(intersection.uv.x * 64),
      y: Math.floor((1 - intersection.uv.y) * 64)
    });
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
