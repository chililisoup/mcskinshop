import React, { Component, RefObject } from 'react';
import ColorPicker from '../basic/colorpicker';
import checkerboard from '@assets/checkerboard.png';
import fullref from '@assets/fullref.png';
import slimref from '@assets/slimref.png';
import * as ImgMod from '../../tools/imgmod';
import * as Util from '../../tools/util';

type AProps = {
  layer: ImgMod.Img;
  slim: boolean;
  updateLayer: (layer: ImgMod.AbstractLayer) => void;
};

type AState = {
  guide: boolean;
  grid: boolean;
  gridSize: number;
};

class LayerEditor extends Component<AProps, AState> {
  mouseActive: string | boolean = false;
  color = '#000000';
  mousePos = { x: 0, y: 0 };
  lastUpdate = new Date();
  canvasRef: RefObject<HTMLCanvasElement | null> = React.createRef();
  layer?: ImgMod.Img;

  constructor(props: AProps) {
    super(props);

    this.state = {
      guide: false,
      grid: true,
      gridSize: 8
    };
  }

  componentDidMount() {
    this.loadLayer();
  }

  componentDidUpdate() {
    this.loadLayer();
  }

  loadLayer = () => {
    if (!this.canvasRef.current) return;
    const ctx = this.canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (!this.props.layer) {
      this.layer = undefined;
      ctx.clearRect(0, 0, 64, 64);
      return;
    }

    if (this.layer && this.props.layer.id === this.layer.id) return;

    this.layer = this.props.layer;
    if (this.layer?.image) {
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(this.layer.image, 0, 0);
    }
  };

  setColor = (color: string) => (this.color = color);

  onMouseMove = (e: React.MouseEvent) => {
    if (!this.canvasRef.current) return;

    const rect = this.canvasRef.current.getBoundingClientRect();
    this.mousePos = {
      x: Math.floor(
        ((e.clientX - rect.left) / (rect.right - rect.left)) * this.canvasRef.current.width
      ),
      y: Math.floor(
        ((e.clientY - rect.top) / (rect.bottom - rect.top)) * this.canvasRef.current.height
      )
    };
    if (this.mouseActive) this.drawPixel();
  };

  onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 2) return;

    this.mouseActive = true;
    if (e.button === 2) this.mouseActive = 'erase';

    this.drawPixel();
  };

  onMouseQuit = () => {
    this.mouseActive = false;
    this.update(true);
  };

  update: (force?: boolean) => void = async force => {
    if (!this.layer) return;
    if (!this.canvasRef.current) return;
    if (new Date().getTime() - this.lastUpdate.getTime() < 100 && !force) return;

    this.lastUpdate = new Date();
    this.layer.rawSrc = this.canvasRef.current.toDataURL();

    await this.layer.render();

    this.props.updateLayer(this.layer);
  };

  drawPixel = () => {
    if (!this.layer) return;
    if (!this.canvasRef.current) return;

    const ctx = this.canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = this.color;

    if (this.mouseActive === 'erase') {
      ctx.clearRect(this.mousePos.x, this.mousePos.y, 1, 1);
    } else ctx.fillRect(this.mousePos.x, this.mousePos.y, 1, 1);

    this.update();
  };

  updateState = <KKey extends keyof AState>(setting: KKey, value: AState[KKey]) => {
    this.setState({ [setting]: value } as Pick<AState, KKey>);
  };

  resizeGrid = (mult: number) => {
    this.setState({ gridSize: Util.clamp(this.state.gridSize * mult, 1, 32) });
  };

  render() {
    return (
      <div>
        <span>
          <ColorPicker default={this.color} update={this.setColor} alpha={true} />
          <label htmlFor="layereditor-guide">Guide</label>
          <input
            type="checkbox"
            id="layereditor-guide"
            checked={this.state.guide}
            onChange={e => this.updateState('guide', e.target.checked)}
          />
          <label htmlFor="layereditor-grid">Grid</label>
          <input
            type="checkbox"
            id="layereditor-grid"
            checked={this.state.grid}
            onChange={e => this.updateState('grid', e.target.checked)}
          />
          <button onClick={() => this.resizeGrid(0.5)}>-</button>
          <button onClick={() => this.resizeGrid(2.0)}>+</button>
        </span>
        <canvas
          className="layereditor-canvas"
          ref={this.canvasRef}
          onMouseMove={this.onMouseMove}
          onMouseDown={this.onMouseDown}
          onMouseUp={this.onMouseQuit}
          onMouseLeave={this.onMouseQuit}
          onContextMenu={e => e.preventDefault()}
          width={64}
          height={64}
          style={{
            backgroundImage:
              (this.state.guide ? `url(${this.props.slim ? slimref : fullref})` : 'none') +
              `, url(${checkerboard})`,
            backgroundSize: `512px, ${this.state.grid ? this.state.gridSize * 16 : 1024}px`
          }}
        />
      </div>
    );
  }
}

export default LayerEditor;
