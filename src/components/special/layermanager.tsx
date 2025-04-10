import React, { Component, ReactNode } from 'react';
import * as ImgMod from '../../tools/imgmod';
import LayerEditor from './layereditor';
import ColorPicker from '../basic/colorpicker';
import DraggableWindow from '../basic/draggablewindow';

type AProps = {
  layers: ImgMod.Layer;
  updateLayers: (layers: ImgMod.Layer) => void;
  slim: boolean;
};

type AState = {
  advanced: boolean;
  layers: ImgMod.Layer;
  selectedLayer?: string;
};

class LayerManager extends Component<AProps, AState> {
  layers;

  constructor(props: AProps) {
    super(props);

    this.state = {
      advanced: false,
      layers: props.layers,
      selectedLayer: undefined
    };

    // Should be receiving the sublayers of the layers, it doesn't need the actual full layers object
    // Also why tf is layers a state and also not a state make it just a state bitch
    this.layers = props.layers;
  }

  updateLayers = () => {
    this.setState({ layers: this.layers });
    this.props.updateLayers(this.layers);
  };

  updateLayer = (index: number, newLayer: ImgMod.AbstractLayer) => {
    const oldLayer = this.layers.sublayers[index];
    this.layers.sublayers[index] = newLayer;

    if (oldLayer !== newLayer) oldLayer.cleanup();

    this.updateLayers();
  };

  moveLayer = (index: number, change: number) => {
    if (index + change < 0) change = this.layers.sublayers.length - 1;
    if (index + change >= this.layers.sublayers.length)
      change = 0 - (this.layers.sublayers.length - 1);
    const layer = this.layers.sublayers[index];
    this.layers.sublayers.splice(index, 1);
    this.layers.sublayers.splice(index + change, 0, layer);
    this.updateLayers();
  };

  duplicateLayer = (index: number) => {
    const copy = this.layers.sublayers[index].copy();
    copy.id = Math.random().toString(16).slice(2);
    this.layers.sublayers.splice(index + 1, 0, copy);
    this.updateLayers();
  };

  removeLayer = (index: number) => {
    this.layers.sublayers.splice(index, 1);
    this.updateLayers();
  };

  flattenLayer: (index: number) => void = async index => {
    const baseLayer = this.layers.sublayers[index];

    const flatLayer = new ImgMod.Img();
    flatLayer.name = baseLayer.name;
    flatLayer.id = Math.random().toString(16).slice(2);

    await baseLayer.render();
    await flatLayer.render(baseLayer.src);

    this.updateLayer(index, flatLayer);
  };

  mergeLayerDown = (index: number) => {
    if (index === 0 || this.layers.sublayers.length < 2) return;

    const topLayer = this.layers.sublayers[index];
    const bottomLayer = this.layers.sublayers[index - 1];
    const mergedLayer = new ImgMod.Layer();

    mergedLayer.name = topLayer.name + ' + ' + bottomLayer.name;
    mergedLayer.id = Math.random().toString(16).slice(2);

    let colors: string[] = [];
    let advanced: boolean[] = [];

    if (bottomLayer instanceof ImgMod.Layer) {
      mergedLayer.sublayers = bottomLayer.sublayers;
      colors = colors.concat(bottomLayer.colors);
      advanced = bottomLayer.advanced ?? advanced;
    } else {
      mergedLayer.sublayers.push(bottomLayer);
      colors.push('null');
      advanced.push(true);
    }

    if (topLayer instanceof ImgMod.Layer) {
      mergedLayer.sublayers = mergedLayer.sublayers.concat(topLayer.sublayers);
      colors = colors.concat(topLayer.colors);
      advanced = advanced.concat(topLayer.advanced ?? false);
    } else {
      mergedLayer.sublayers.push(topLayer);
      colors.push('null');
      advanced.push(true);
    }

    mergedLayer.colors = colors;
    mergedLayer.advanced = advanced;

    this.layers.sublayers.splice(index, 1);
    this.layers.sublayers[index - 1] = mergedLayer;
    this.updateLayers();
  };

  selectForEdit = (index: number) => {
    this.setState({ selectedLayer: this.layers.sublayers[index].id });
  };

  addLayer: () => void = async () => {
    const layer = new ImgMod.Img();
    layer.name = 'New Layer';
    layer.id = Math.random().toString(16).slice(2);

    await layer.render();

    this.layers.sublayers.push(layer);
    this.updateLayers();
  };

  render() {
    let elem: ReactNode = <div />;
    if (this.state.layers.sublayers.length) {
      elem = this.state.layers.sublayers.map((asset, i) => (
        <Layer
          key={asset.id}
          asset={asset}
          index={i}
          updateLayer={this.updateLayer}
          moveLayer={this.moveLayer}
          duplicateLayer={this.duplicateLayer}
          removeLayer={this.removeLayer}
          flattenLayer={this.flattenLayer}
          mergeLayerDown={this.mergeLayerDown}
          selectForEdit={this.selectForEdit}
          advanced={this.state.advanced}
        />
      ));
    }

    let selectedLayer = null;
    let selectedLayerIndex = null;
    for (let i = 0; i < this.layers.sublayers.length; i++) {
      if (this.layers.sublayers[i].id === this.state.selectedLayer) {
        selectedLayer = this.layers.sublayers[i];
        selectedLayerIndex = i;
        break;
      }
    }

    return (
      <div>
        <div className="LayerManager">
          <div className="container layer-manager">{elem}</div>
          <span>
            <label htmlFor="advancedToggle">Advanced mode</label>
            <input
              type="checkbox"
              id="advancedToggle"
              onChange={e => this.setState({ advanced: e.target.checked })}
            />
            <button onClick={this.addLayer}>New Layer</button>
          </span>
        </div>
        {selectedLayer && selectedLayerIndex !== null && selectedLayer instanceof ImgMod.Img && (
          <DraggableWindow
            title={selectedLayer.name ?? ''}
            pos={{ x: 350, y: 0 }}
            close={() => this.setState({ selectedLayer: undefined })}
            children={
              <LayerEditor
                layer={selectedLayer}
                updateLayer={layer => this.updateLayer(selectedLayerIndex, layer)}
                slim={this.props.slim}
              />
            }
          />
        )}
      </div>
    );
  }
}

type BProps = {
  asset: ImgMod.AbstractLayer;
  index: number;
  updateLayer: (index: number, newLayer: ImgMod.AbstractLayer) => void;
  moveLayer: (index: number, change: number) => void;
  duplicateLayer: (index: number) => void;
  removeLayer: (index: number) => void;
  flattenLayer: (index: number) => void;
  mergeLayerDown: (index: number) => void;
  selectForEdit: (index: number) => void;
  advanced: boolean;
};

type BState = {
  opacity: number;
  hue: number;
  saturation: number;
  brightness: number;
  contrast: number;
  invert: number;
  sepia: number;
};

class Layer extends Component<BProps, BState> {
  asset;

  constructor(props: BProps) {
    super(props);

    this.state = {
      opacity: 100,
      hue: 0,
      saturation: 100,
      brightness: 100,
      contrast: 100,
      invert: 0,
      sepia: 0
    };

    this.asset = props.asset;
  }

  changeColor: (colorIndex: number, color: string) => void = async (colorIndex, color) => {
    if (!(this.asset instanceof ImgMod.Layer)) return;
    if (!(this.asset.colors instanceof Array)) return;

    this.asset.colors[colorIndex] = color;
    await this.asset.color();
    this.updateLayer();
  };

  toggleActive = () => {
    this.asset.active = !this.asset.active;
    this.updateLayer();
  };

  changeBlendMode = (blend: GlobalCompositeOperation) => {
    this.asset.propagateBlendMode(blend);
    this.updateLayer();
  };

  updateFilter = <KKey extends keyof BState>(filter: KKey, value: number) => {
    this.setState({ [filter]: value } as Pick<BState, KKey>);

    const filterString =
      'opacity(' +
      this.state.opacity +
      '%) ' +
      'hue-rotate(' +
      this.state.hue +
      'deg) ' +
      'saturate(' +
      this.state.saturation +
      '%) ' +
      'brightness(' +
      this.state.brightness +
      '%) ' +
      'contrast(' +
      this.state.contrast +
      '%) ' +
      'invert(' +
      this.state.invert +
      '%) ' +
      'sepia(' +
      this.state.sepia +
      '%)';

    this.asset.propagateFilter(filterString);
    this.updateLayer();
  };

  updateLayer = () => this.props.updateLayer(this.props.index, this.asset);

  render() {
    const colors: ReactNode[] = [];
    if (this.asset instanceof ImgMod.Layer) {
      const layer = this.asset;

      if (layer.colors instanceof Array) {
        layer.colors.forEach((color, i) => {
          if (
            color !== 'null' &&
            color !== 'erase' &&
            (!layer.advanced || !layer.advanced[i] || this.props.advanced)
          ) {
            colors.push(
              <ColorPicker
                key={i + (layer.id ?? '')}
                default={color}
                update={color => this.changeColor(i, color)}
              />
            );
          }
        });
      }
    }

    return (
      <div className="manager-layer container">
        <span className="layerTitle">
          <input type="checkbox" checked={this.asset.active} onChange={() => this.toggleActive()} />
          <p>{this.asset.name}</p>
          {this.asset instanceof ImgMod.Img && !this.asset.dynamic && (
            <button onClick={() => this.props.selectForEdit(this.props.index)}>Edit</button>
          )}
          {this.asset instanceof ImgMod.Img && this.asset.dynamic && (
            <button disabled>Edit in external editor</button>
          )}
        </span>
        <span>
          <LayerPreview asset={this.asset} />
          <div className="manager-layer-buttons">
            <button onClick={() => this.props.moveLayer(this.props.index, 1)}>&#9650;</button>
            <button onClick={() => this.props.moveLayer(this.props.index, -1)}>&#9660;</button>
          </div>
          <div className="manager-layer-buttons">
            <button onClick={() => this.props.duplicateLayer(this.props.index)}>&#128471;</button>
            <button onClick={() => this.props.removeLayer(this.props.index)}>&#10006;</button>
          </div>
          <div className="manager-layer-buttons">
            <button onClick={() => this.props.flattenLayer(this.props.index)}>&#8676;</button>
            <button onClick={() => this.props.mergeLayerDown(this.props.index)}>&#10515;</button>
          </div>
          <div className="manager-layer-colors">{colors}</div>
        </span>
        {this.props.advanced && (
          <div className="settingsList">
            <span>
              <label htmlFor={'blendSelector' + this.asset.id}>Blend Mode:</label>
              <select
                id={'blendSelector' + this.asset.id}
                value={this.asset.blend}
                onChange={e => this.changeBlendMode(e.target.value as GlobalCompositeOperation)}
              >
                <option value="source-over">Source Over</option>
                <option value="source-in">Source In</option>
                <option value="source-out">Source Out</option>
                <option value="source-atop">Source Atop</option>
                <option value="destination-over">Destination Over</option>
                <option value="destination-in">Destination In</option>
                <option value="destination-out">Destination Out</option>
                <option value="destination-atop">Destination Atop</option>
                <option value="lighter">Lighter</option>
                <option value="copy">Copy</option>
                <option value="xor">XOR</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
                <option value="color-dodge">Color Dodge</option>
                <option value="color-burn">Color Burn</option>
                <option value="hard-light">Hard Light</option>
                <option value="soft-light">Soft Light</option>
                <option value="difference">Difference</option>
                <option value="exclusion">Exclusion</option>
                <option value="hue">Hue</option>
                <option value="saturation">Saturation</option>
                <option value="color">Color</option>
                <option value="luminosity">Luminosity</option>
              </select>
            </span>
            <span>
              <label htmlFor={'opacitySlider' + this.asset.id}>
                Opacity: {this.state.opacity}%
              </label>
              <input
                type="range"
                id={'opacitySlider' + this.asset.id}
                min={0}
                max={100}
                value={this.state.opacity}
                onChange={e => this.updateFilter('opacity', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'hueSlider' + this.asset.id}>Hue: {this.state.hue}°</label>
              <input
                type="range"
                id={'hueSlider' + this.asset.id}
                min={-180}
                max={180}
                value={this.state.hue}
                onChange={e => this.updateFilter('hue', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'saturationSlider' + this.asset.id}>
                Saturation: {this.state.saturation}%
              </label>
              <input
                type="range"
                id={'saturationSlider' + this.asset.id}
                min={0}
                max={200}
                value={this.state.saturation}
                onChange={e => this.updateFilter('saturation', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'brightnessSlider' + this.asset.id}>
                Brightness: {this.state.brightness}%
              </label>
              <input
                type="range"
                id={'brightnessSlider' + this.asset.id}
                min={0}
                max={200}
                value={this.state.brightness}
                onChange={e => this.updateFilter('brightness', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'contrastSlider' + this.asset.id}>
                Contrast: {this.state.contrast}%
              </label>
              <input
                type="range"
                id={'contrastSlider' + this.asset.id}
                min={0}
                max={200}
                value={this.state.contrast}
                onChange={e => this.updateFilter('contrast', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'invertSlider' + this.asset.id}>Invert: {this.state.invert}%</label>
              <input
                type="range"
                id={'invertSlider' + this.asset.id}
                min={0}
                max={100}
                value={this.state.invert}
                onChange={e => this.updateFilter('invert', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'sepiaSlider' + this.asset.id}>Sepia: {this.state.sepia}%</label>
              <input
                type="range"
                id={'sepiaSlider' + this.asset.id}
                min={0}
                max={100}
                value={this.state.sepia}
                onChange={e => this.updateFilter('sepia', Number(e.target.value))}
              />
            </span>
          </div>
        )}
      </div>
    );
  }
}

type CProps = {
  asset: ImgMod.AbstractLayer;
};

type CState = {
  src?: string;
  alt: string;
};

class LayerPreview extends Component<CProps, CState> {
  constructor(props: CProps) {
    super(props);

    this.state = {
      src: undefined,
      alt: ''
    };
  }

  componentDidMount() {
    this.updatePreview();
  }

  componentDidUpdate(prevProps: CProps) {
    if (prevProps !== this.props) this.updatePreview();
  }

  updatePreview: () => void = async () => {
    await this.props.asset.render();

    this.setState({ src: this.props.asset.src, alt: this.props.asset.name ?? '' });
  };

  render() {
    return <img src={this.state.src} alt={this.state.alt} title={this.state.alt} />;
  }
}

export default LayerManager;
