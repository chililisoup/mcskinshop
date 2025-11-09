import React, { Component } from 'react';
import ColorPicker from '@components/basic/colorpicker';
import checkerboard from '@assets/checkerboard.png';
import fullref from '@assets/fullref.png';
import slimref from '@assets/slimref.png';
import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import { SkinManager } from '@tools/skinman';

type AProps = {
  layer?: ImgMod.AbstractLayer;
};

type AState = {
  guide: boolean;
  grid: boolean;
  gridSize: number;
  focusLayer: boolean;
};

export default class LayerEditor extends Component<AProps, AState> {
  mouseActive: string | boolean = false;
  color = '#000000';
  mousePos = { x: 0, y: 0 };
  layerCanvas = new OffscreenCanvas(64, 64);
  previewCanvas = new OffscreenCanvas(64, 64);
  layerCtx;
  previewCtx;
  canvasRef: React.RefObject<HTMLCanvasElement | null> = React.createRef();

  constructor(props: AProps) {
    super(props);

    this.state = {
      guide: false,
      grid: true,
      gridSize: 8,
      focusLayer: false
    };

    this.layerCtx = this.layerCanvas.getContext('2d')!;
    this.previewCtx = this.previewCanvas.getContext('2d')!;
  }

  componentDidMount() {
    this.loadLayer();
    this.updateSkin();
    SkinManager.speaker.registerListener(this.updateSkin);
  }

  componentWillUnmount() {
    SkinManager.speaker.unregisterListener(this.updateSkin);
  }

  componentDidUpdate(prevProps: Readonly<AProps>, prevState: Readonly<AState>) {
    if (prevState.focusLayer !== this.state.focusLayer || prevProps.layer !== this.props.layer)
      this.updateSkin();
    if (prevProps.layer !== this.props.layer) this.loadLayer();
  }

  updateSkinFocus = () => {
    if (!this.canvasRef.current) return;
    const ctx = this.canvasRef.current.getContext('2d')!;

    ctx.clearRect(0, 0, 64, 64);
    if (!this.props.layer) return;

    if (this.props.layer instanceof ImgMod.ImgPreview && this.props.layer.base.image)
      ctx.drawImage(this.props.layer.base.image, 0, 0);
    else if (this.props.layer.image) {
      ctx.drawImage(this.props.layer.image, 0, 0);
    }
  };

  updateSkin = () => {
    if (this.state.focusLayer) return this.updateSkinFocus();

    if (!this.canvasRef.current) return;
    const ctx = this.canvasRef.current.getContext('2d')!;

    ctx.clearRect(0, 0, 64, 64);
    const skin = SkinManager.getRoot().image;
    if (skin) ctx.drawImage(skin, 0, 0);
  };

  loadLayer = () => {
    if (!this.props.layer) {
      this.layerCtx.clearRect(0, 0, 64, 64);
      return;
    }

    const image =
      this.props.layer instanceof ImgMod.ImgPreview
        ? this.props.layer.base.image
        : this.props.layer.image;
    if (image) {
      this.layerCtx.clearRect(0, 0, 64, 64);
      this.layerCtx.drawImage(image, 0, 0);
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

    this.drawPixel();
  };

  onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 2) return;

    this.mouseActive = true;
    if (e.button === 2) this.mouseActive = 'erase';

    this.drawPixel();
    this.updatePreview();
  };

  onMouseQuit = () => {
    this.mouseActive = false;
    this.previewCtx.clearRect(0, 0, 64, 64);
    this.updatePreview();
  };

  updateImg: () => void = async () => {
    if (!(this.props.layer instanceof ImgMod.ImgPreview && !this.props.layer.dynamic)) return;

    await this.props.layer.base.loadImage(this.layerCanvas);
    this.props.layer.base.markChanged();
    SkinManager.updateSkin();
  };

  updatePreview = () => {
    if (!(this.props.layer instanceof ImgMod.ImgPreview && !this.props.layer.dynamic)) return;

    if (this.state.focusLayer && this.canvasRef.current) {
      const ctx = this.canvasRef.current.getContext('2d')!;
      ctx.drawImage(this.previewCanvas, 0, 0);
    }

    this.props.layer.image = this.previewCanvas.transferToImageBitmap();
    this.props.layer.markChanged();
    SkinManager.updateSkin();
  };

  drawPixel = () => {
    if (!(this.props.layer instanceof ImgMod.ImgPreview && !this.props.layer.dynamic)) return;

    this.previewCtx.clearRect(0, 0, 64, 64);

    if (this.mouseActive) {
      this.layerCtx.fillStyle = this.color;

      if (this.mouseActive === 'erase') {
        this.layerCtx.clearRect(this.mousePos.x, this.mousePos.y, 1, 1);
      } else this.layerCtx.fillRect(this.mousePos.x, this.mousePos.y, 1, 1);

      this.updateImg();
    } else {
      this.previewCtx.fillStyle = this.color;

      this.previewCtx.fillRect(this.mousePos.x, this.mousePos.y, 1, 1);

      this.updatePreview();
    }
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
          className={`layereditor-canvas${this.props.layer instanceof ImgMod.ImgPreview && !this.props.layer.dynamic ? '' : ' not-allowed'}`}
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
              (this.state.guide ? `url(${SkinManager.getSlim() ? slimref : fullref})` : 'none') +
              `, url(${checkerboard})`,
            backgroundSize: `512px, ${this.state.grid ? this.state.gridSize * 16 : 1024}px`
          }}
        />
      </div>
    );
  }
}
