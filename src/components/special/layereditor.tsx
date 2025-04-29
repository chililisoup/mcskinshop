import React, { Component, RefObject } from 'react';
import ColorPicker from '../basic/colorpicker';
import checkerboard from '@assets/checkerboard.png';
import fullref from '@assets/fullref.png';
import slimref from '@assets/slimref.png';
import * as ImgMod from '../../tools/imgmod';
import * as Util from '../../tools/util';

type AProps = {
  layer?: ImgMod.AbstractLayer;
  skin?: ImageBitmap;
  slim: boolean;
  updateLayer: () => void;
};

type AState = {
  guide: boolean;
  grid: boolean;
  gridSize: number;
  focusLayer: boolean;
};

class LayerEditor extends Component<AProps, AState> {
  mouseActive: string | boolean = false;
  color = '#000000';
  mousePos = { x: 0, y: 0 };
  layerCanvas = new OffscreenCanvas(64, 64);
  layerCtx;
  canvasRef: RefObject<HTMLCanvasElement | null> = React.createRef();

  constructor(props: AProps) {
    super(props);

    this.state = {
      guide: false,
      grid: true,
      gridSize: 8,
      focusLayer: false
    };

    this.layerCtx = this.layerCanvas.getContext('2d')!;
  }

  componentDidMount() {
    this.loadLayer();
    this.updateSkin();
  }

  componentDidUpdate(prevProps: Readonly<AProps>, prevState: Readonly<AState>) {
    if (prevState.focusLayer !== this.state.focusLayer || prevProps.skin !== this.props.skin)
      this.updateSkin();
    if (prevProps.layer !== this.props.layer) this.loadLayer();
  }

  updateSkinFocus = () => {
    if (!this.canvasRef.current) return;
    const ctx = this.canvasRef.current.getContext('2d')!;

    if (!this.props.layer) {
      ctx.clearRect(0, 0, 64, 64);
      return;
    }

    if (this.props.layer?.image) {
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(this.props.layer.image, 0, 0);
    }
  };

  updateSkin = () => {
    if (this.state.focusLayer) return this.updateSkinFocus();

    if (!this.canvasRef.current) return;
    const ctx = this.canvasRef.current.getContext('2d')!;

    ctx.clearRect(0, 0, 64, 64);
    if (this.props.skin) ctx.drawImage(this.props.skin, 0, 0);
  };

  loadLayer = () => {
    if (!this.props.layer) {
      this.layerCtx.clearRect(0, 0, 64, 64);
      return;
    }

    if (this.props.layer?.image) {
      this.layerCtx.clearRect(0, 0, 64, 64);
      this.layerCtx.drawImage(this.props.layer.image, 0, 0);
    }
  };

  setColor = (color: string) => (this.color = color);

  onMouseMove: (e: React.MouseEvent) => void = async e => {
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

    await this.drawPixel();
    if (this.mouseActive) this.updateRawSrc();
    else this.updateSrc();
  };

  onMouseDown: (e: React.MouseEvent) => void = async e => {
    if (e.button !== 0 && e.button !== 2) return;

    this.mouseActive = true;
    if (e.button === 2) this.mouseActive = 'erase';

    await this.drawPixel();
    this.updateRawSrc();
  };

  onMouseQuit: () => void = async () => {
    this.mouseActive = false;
    await this.reloadLayer();
    this.updateSrc();
  };

  updateRawSrc: () => void = async () => {
    if (!(this.props.layer instanceof ImgMod.Img && !this.props.layer.dynamic)) return;

    await this.props.layer.loadImage(this.layerCanvas);
    this.props.updateLayer();
  };

  updateSrc = () => {
    if (!(this.props.layer instanceof ImgMod.Img && !this.props.layer.dynamic)) return;

    this.props.layer.image = this.layerCanvas.transferToImageBitmap();
    this.props.updateLayer();
  };

  reloadLayer = async () => {
    if (!(this.props.layer instanceof ImgMod.Img && !this.props.layer.dynamic)) return;

    this.layerCtx.clearRect(0, 0, 64, 64);
    this.layerCtx.drawImage(
      await createImageBitmap(await Util.getBlob(this.props.layer.rawSrc)),
      0,
      0
    );
  };

  drawPixel = async () => {
    if (!(this.props.layer instanceof ImgMod.Img && !this.props.layer.dynamic)) return;
    if (!this.canvasRef.current) return;

    await this.reloadLayer();
    this.layerCtx.fillStyle = this.color;

    if (this.mouseActive === 'erase') {
      this.layerCtx.clearRect(this.mousePos.x, this.mousePos.y, 1, 1);
    } else this.layerCtx.fillRect(this.mousePos.x, this.mousePos.y, 1, 1);
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
            onChange={e => this.setState({ guide: e.target.checked })}
          />
          <label htmlFor="layereditor-grid">Grid</label>
          <input
            type="checkbox"
            id="layereditor-grid"
            checked={this.state.grid}
            onChange={e => this.setState({ grid: e.target.checked })}
          />
          <button onClick={() => this.resizeGrid(0.5)}>-</button>
          <button onClick={() => this.resizeGrid(2.0)}>+</button>
          <label htmlFor="layereditor-focus">Focus Layer</label>
          <input
            type="checkbox"
            id="layereditor-focus"
            checked={this.state.focusLayer}
            onChange={e => this.setState({ focusLayer: e.target.checked })}
          />
        </span>
        <canvas
          className={`layereditor-canvas${this.props.layer instanceof ImgMod.Img && !this.props.layer.dynamic ? '' : ' not-allowed'}`}
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
