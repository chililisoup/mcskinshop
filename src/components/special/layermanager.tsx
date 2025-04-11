import React, { Component, ReactNode } from 'react';
import * as ImgMod from '../../tools/imgmod';
import LayerEditor from './layereditor';
import ColorPicker from '../basic/colorpicker';
import DraggableWindow from '../basic/draggablewindow';

type AProps = {
  layers: ImgMod.AbstractLayer[];
  updateLayers: () => void;
  slim: boolean;
};

type AState = {
  advanced: boolean;
  selectedLayer?: string;
};

class LayerManager extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    this.state = {
      advanced: false,
      selectedLayer: undefined
    };
  }

  updateLayer = (index: number, newLayer: ImgMod.AbstractLayer) => {
    const oldLayer = this.props.layers[index];
    this.props.layers[index] = newLayer;

    if (oldLayer !== newLayer) oldLayer.cleanup();

    this.props.updateLayers();
  };

  moveLayer = (index: number, change: number) => {
    if (index + change < 0) change = this.props.layers.length - 1;
    if (index + change >= this.props.layers.length)
      change = 0 - (this.props.layers.length - 1);
    const layer = this.props.layers[index];
    this.props.layers.splice(index, 1);
    this.props.layers.splice(index + change, 0, layer);
    this.props.updateLayers();
  };

  duplicateLayer = (index: number) => {
    const copy = this.props.layers[index].copy();
    copy.id = Math.random().toString(16).slice(2);
    this.props.layers.splice(index + 1, 0, copy);
    this.props.updateLayers();
  };

  removeLayer = (index: number) => {
    this.props.layers.splice(index, 1);
    this.props.updateLayers();
  };

  flattenLayer: (index: number) => void = async index => {
    const baseLayer = this.props.layers[index];

    const flatLayer = new ImgMod.Img();
    flatLayer.name = baseLayer.name;
    flatLayer.id = Math.random().toString(16).slice(2);

    await baseLayer.render();
    await flatLayer.render(baseLayer.src);

    this.updateLayer(index, flatLayer);
  };

  mergeLayerDown = (index: number) => {
    if (index === 0 || this.props.layers.length < 2) return;

    const topLayer = this.props.layers[index];
    const bottomLayer = this.props.layers[index - 1];

    if (bottomLayer instanceof ImgMod.Layer) {
      bottomLayer.name += ' + ' + topLayer.name;
      bottomLayer.id = Math.random().toString(16).slice(2);
      bottomLayer.assertColorArray();

      if (topLayer instanceof ImgMod.Layer) {
        topLayer.assertColorArray();

        bottomLayer.sublayers.push(...topLayer.sublayers);
        (bottomLayer.colors as string[]).push(...topLayer.colors);

        if (bottomLayer.advanced || topLayer.advanced) {
          bottomLayer.assertAdvancedArray();
          topLayer.assertAdvancedArray();

          bottomLayer.advanced!.push(...topLayer.advanced!);
        }
      } else {
        bottomLayer.sublayers.push(topLayer);
        (bottomLayer.colors as string[]).push('null');

        if (bottomLayer.advanced) bottomLayer.advanced.push(true);
      }

      this.props.layers.splice(index, 1);
      this.props.updateLayers();
      return;
    }

    if (topLayer instanceof ImgMod.Layer) {
      topLayer.name = bottomLayer.name + ' + ' + topLayer.name;
      topLayer.id = Math.random().toString(16).slice(2);
      topLayer.assertColorArray();

      topLayer.sublayers.unshift(bottomLayer);
      (topLayer.colors as string[]).unshift('null');

      if (topLayer.advanced) topLayer.advanced.unshift(true);

      this.props.layers.splice(index - 1, 1);
      this.props.updateLayers();
      return;
    }

    const mergedLayer = new ImgMod.Layer([bottomLayer, topLayer], 'null');
    mergedLayer.name = bottomLayer.name + ' + ' + topLayer.name;
    mergedLayer.id = Math.random().toString(16).slice(2);

    this.props.layers.splice(index - 1, 2, mergedLayer);
    this.props.updateLayers();
  };

  selectForEdit = (index: number) => {
    this.setState({ selectedLayer: this.props.layers[index].id });
  };

  ungroup = (index: number) => {
    const layer = this.props.layers[index];
    if (!(layer instanceof ImgMod.Layer)) return;

    layer.sublayers.forEach((sublayer, i) => {
      sublayer.name ??= `${layer.name}.${i}`;
      sublayer.id ??= Math.random().toString(16).slice(2);
    });

    this.props.layers.splice(index, 1, ...layer.sublayers);
    this.props.updateLayers();
  };

  addLayer: () => void = async () => {
    const layer = new ImgMod.Img();
    layer.name = 'New Layer';
    layer.id = Math.random().toString(16).slice(2);

    await layer.render();

    this.props.layers.push(layer);
    this.props.updateLayers();
  };

  render() {
    let elem: ReactNode = <div />;
    if (this.props.layers.length) {
      elem = this.props.layers.map((asset, i) => (
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
          ungroup={this.ungroup}
          advanced={this.state.advanced}
        />
      ));
    }

    let selectedLayer = null;
    let selectedLayerIndex = null;
    for (let i = 0; i < this.props.layers.length; i++) {
      if (this.props.layers[i].id === this.state.selectedLayer) {
        selectedLayer = this.props.layers[i];
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
          >
            <LayerEditor
              layer={selectedLayer}
              updateLayer={layer => this.updateLayer(selectedLayerIndex, layer)}
              slim={this.props.slim}
            />
          </DraggableWindow>
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
  ungroup: (index: number) => void;
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
  }

  changeColor: (colorIndex: number, color: string) => void = async (colorIndex, color) => {
    if (!(this.props.asset instanceof ImgMod.Layer)) return;
    if (!(this.props.asset.colors instanceof Array)) return;

    this.props.asset.colors[colorIndex] = color;
    await this.props.asset.color();
    this.updateLayer();
  };

  toggleActive = () => {
    this.props.asset.active = !this.props.asset.active;
    this.updateLayer();
  };

  changeBlendMode = (blend: GlobalCompositeOperation) => {
    this.props.asset.propagateBlendMode(blend);
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

    this.props.asset.propagateFilter(filterString);
    this.updateLayer();
  };

  renameLayer = (name: string) => {
    this.props.asset.name = name;
    this.updateLayer();
  };

  updateLayer = () => this.props.updateLayer(this.props.index, this.props.asset);

  render() {
    const colors: ReactNode[] = [];
    if (this.props.asset instanceof ImgMod.Layer) {
      const layer = this.props.asset;

      if (layer.colors instanceof Array) {
        layer.colors.forEach((color, i) => {
          if (
            !ImgMod.checkLayerType(color) &&
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
          <input
            type="checkbox"
            title="Toggle Layer Visibility"
            checked={this.props.asset.active}
            onChange={() => this.toggleActive()}
          />
          <input
            type="text"
            value={this.props.asset.name ?? ''}
            onChange={e => this.renameLayer(e.target.value)}
          />
          {this.props.asset instanceof ImgMod.Img && !this.props.asset.dynamic && (
            <button onClick={() => this.props.selectForEdit(this.props.index)}>Edit</button>
          )}
          {this.props.asset instanceof ImgMod.Img && this.props.asset.dynamic && (
            <button disabled>Edit in external editor</button>
          )}
          {this.props.asset instanceof ImgMod.Layer && (
            <button onClick={() => this.props.ungroup(this.props.index)}>Ungroup</button>
          )}
        </span>
        <span>
          <LayerPreview asset={this.props.asset} />
          <div className="manager-layer-buttons">
            <button onClick={() => this.props.moveLayer(this.props.index, 1)} title="Move Layer Up">
              &#9650;
            </button>
            <button
              onClick={() => this.props.moveLayer(this.props.index, -1)}
              title="Move Layer Down"
            >
              &#9660;
            </button>
          </div>
          <div className="manager-layer-buttons">
            <button
              onClick={() => this.props.duplicateLayer(this.props.index)}
              title="Duplicate Layer"
            >
              &#128471;
            </button>
            <button onClick={() => this.props.removeLayer(this.props.index)} title="Delete Layer">
              &#10006;
            </button>
          </div>
          <div className="manager-layer-buttons">
            <button onClick={() => this.props.flattenLayer(this.props.index)} title="Flatten Layer">
              &#8676;
            </button>
            <button
              onClick={() => this.props.mergeLayerDown(this.props.index)}
              title="Merge Layer Down"
            >
              &#10515;
            </button>
          </div>
          <div className="manager-layer-colors">{colors}</div>
        </span>
        {this.props.advanced && (
          <div className="settingsList">
            <span>
              <label htmlFor={'blendSelector' + this.props.asset.id}>Blend Mode:</label>
              <select
                id={'blendSelector' + this.props.asset.id}
                value={this.props.asset.blend}
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
              <label htmlFor={'opacitySlider' + this.props.asset.id}>
                Opacity: {this.state.opacity}%
              </label>
              <input
                type="range"
                id={'opacitySlider' + this.props.asset.id}
                min={0}
                max={100}
                value={this.state.opacity}
                onChange={e => this.updateFilter('opacity', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'hueSlider' + this.props.asset.id}>Hue: {this.state.hue}°</label>
              <input
                type="range"
                id={'hueSlider' + this.props.asset.id}
                min={-180}
                max={180}
                value={this.state.hue}
                onChange={e => this.updateFilter('hue', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'saturationSlider' + this.props.asset.id}>
                Saturation: {this.state.saturation}%
              </label>
              <input
                type="range"
                id={'saturationSlider' + this.props.asset.id}
                min={0}
                max={200}
                value={this.state.saturation}
                onChange={e => this.updateFilter('saturation', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'brightnessSlider' + this.props.asset.id}>
                Brightness: {this.state.brightness}%
              </label>
              <input
                type="range"
                id={'brightnessSlider' + this.props.asset.id}
                min={0}
                max={200}
                value={this.state.brightness}
                onChange={e => this.updateFilter('brightness', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'contrastSlider' + this.props.asset.id}>
                Contrast: {this.state.contrast}%
              </label>
              <input
                type="range"
                id={'contrastSlider' + this.props.asset.id}
                min={0}
                max={200}
                value={this.state.contrast}
                onChange={e => this.updateFilter('contrast', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'invertSlider' + this.props.asset.id}>
                Invert: {this.state.invert}%
              </label>
              <input
                type="range"
                id={'invertSlider' + this.props.asset.id}
                min={0}
                max={100}
                value={this.state.invert}
                onChange={e => this.updateFilter('invert', Number(e.target.value))}
              />
            </span>
            <span>
              <label htmlFor={'sepiaSlider' + this.props.asset.id}>
                Sepia: {this.state.sepia}%
              </label>
              <input
                type="range"
                id={'sepiaSlider' + this.props.asset.id}
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
