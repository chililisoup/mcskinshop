import React, { Component, ReactNode } from 'react';
import * as ImgMod from '../../tools/imgmod';
import * as Util from '../../tools/util';
import LayerEditor from './layereditor';
import ColorPicker from '../basic/colorpicker';
import DraggableWindow from '../basic/draggablewindow';
import PropertiesList from '../basic/propertieslist';

type AProps = {
  layers: ImgMod.AbstractLayer[];
  updateLayers: () => void;
  slim: boolean;
};

type AState = {
  selectedLayer?: string;
};

class LayerManager extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    this.state = {
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
    if (index + change >= this.props.layers.length) change = 0 - (this.props.layers.length - 1);
    const layer = this.props.layers[index];
    this.props.layers.splice(index, 1);
    this.props.layers.splice(index + change, 0, layer);
    this.props.updateLayers();
  };

  duplicateLayer = (index: number) => {
    const copy = this.props.layers[index].copy();
    copy.id = Util.randomKey();
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
    flatLayer.id = Util.randomKey();

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
      bottomLayer.id = Util.randomKey();
      bottomLayer.assertColorArray();

      if (topLayer instanceof ImgMod.Layer) {
        topLayer.assertColorArray();

        bottomLayer.sublayers.push(...topLayer.sublayers);
        (bottomLayer.colors as (string | ImgMod.RelativeColor)[]).push(...topLayer.colors);

        if (bottomLayer.advanced || topLayer.advanced) {
          bottomLayer.assertAdvancedArray();
          topLayer.assertAdvancedArray();

          bottomLayer.advanced!.push(...topLayer.advanced!);
        }
      } else {
        bottomLayer.sublayers.push(topLayer);
        (bottomLayer.colors as (string | ImgMod.RelativeColor)[]).push('null');

        if (bottomLayer.advanced) bottomLayer.advanced.push(true);
      }

      this.props.layers.splice(index, 1);
      this.props.updateLayers();
      return;
    }

    if (topLayer instanceof ImgMod.Layer) {
      topLayer.name = bottomLayer.name + ' + ' + topLayer.name;
      topLayer.id = Util.randomKey();
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
    mergedLayer.id = Util.randomKey();

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
      sublayer.id ??= Util.randomKey();
      if (sublayer instanceof ImgMod.Img) sublayer.rawSrc = sublayer.src;
    });

    this.props.layers.splice(index, 1, ...layer.sublayers);
    this.props.updateLayers();
  };

  addLayer: () => void = async () => {
    const layer = new ImgMod.Img();
    layer.name = 'New Layer';
    layer.id = Util.randomKey();

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
          <button onClick={this.addLayer}>New Layer</button>
        </div>
        {selectedLayer && selectedLayerIndex !== null && selectedLayer instanceof ImgMod.Img && (
          <DraggableWindow
            title={selectedLayer.name ?? ''}
            startPos={{ x: 350, y: 0 }}
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
};

type BState = {
  fxOpen: boolean;
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
      fxOpen: false,
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
    this.setState({ [filter]: value } as Pick<BState, KKey>, () => {
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
    });
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
          if (!layer.advanced || !layer.advanced[i] || this.state.fxOpen) {
            if (typeof color === 'string' && !ImgMod.checkLayerType(color))
              colors.push(
                <ColorPicker
                  key={i + (layer.id ?? '')}
                  default={color}
                  update={color => this.changeColor(i, color)}
                />
              );
            else if (typeof color === 'object')
              colors.push(
                <ColorPicker
                  key={i + (layer.id ?? '')}
                  default={layer.getTrueColor(color)}
                  linked={true}
                  unlink={() => {
                    const colors = [...layer.colors];
                    colors[i] = layer.getTrueColor(color);
                    layer.colors = colors;
                    this.updateLayer();
                  }}
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
          <button onClick={() => this.setState({ fxOpen: !this.state.fxOpen })}>
            {this.state.fxOpen ? '/\\' : '\\/'}
          </button>
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
        {this.state.fxOpen && (
          <PropertiesList
            numberCallback={(id, value) => {
              if (id in this.state) this.updateFilter(id as keyof BState, value);
            }}
            stringCallback={(id, value) => {
              if (id === 'blend') this.changeBlendMode(value as GlobalCompositeOperation);
            }}
            properties={[
              {
                name: 'Blend Mode',
                id: 'blend',
                type: 'select',
                value: this.props.asset.blend,
                options: [
                  ['source-over', 'Source Over'],
                  ['source-in', 'Source In'],
                  ['source-out', 'Source Out'],
                  ['source-atop', 'Source Atop'],
                  ['destination-over', 'Destination Over'],
                  ['destination-in', 'Destination In'],
                  ['destination-out', 'Destination Out'],
                  ['destination-atop', 'Destination Atop'],
                  ['lighter', 'Lighter'],
                  ['copy', 'Copy'],
                  ['xor', 'XOR'],
                  ['multiply', 'Multiply'],
                  ['screen', 'Screen'],
                  ['overlay', 'Overlay'],
                  ['darken', 'Darken'],
                  ['lighten', 'Lighten'],
                  ['color-dodge', 'Color Dodge'],
                  ['color-burn', 'Color Burn'],
                  ['hard-light', 'Hard Light'],
                  ['soft-light', 'Soft Light'],
                  ['difference', 'Difference'],
                  ['exclusion', 'Exclusion'],
                  ['hue', 'Hue'],
                  ['saturation', 'Saturation'],
                  ['color', 'Color'],
                  ['luminosity', 'Luminosity']
                ]
              },
              {
                name: 'Opacity',
                id: 'opacity',
                type: 'range',
                value: this.state.opacity,
                min: 0,
                max: 100,
                subtype: 'percent'
              },
              {
                name: 'Hue',
                id: 'hue',
                type: 'range',
                value: this.state.hue,
                min: -180,
                max: 180,
                subtype: 'degrees'
              },
              {
                name: 'Saturation',
                id: 'saturation',
                type: 'range',
                value: this.state.saturation,
                min: 0,
                max: 200,
                subtype: 'percent'
              },
              {
                name: 'Brightness',
                id: 'brightness',
                type: 'range',
                value: this.state.brightness,
                min: 0,
                max: 200,
                subtype: 'percent'
              },
              {
                name: 'Contrast',
                id: 'contrast',
                type: 'range',
                value: this.state.contrast,
                min: 0,
                max: 200,
                subtype: 'percent'
              },
              {
                name: 'Invert',
                id: 'invert',
                type: 'range',
                value: this.state.invert,
                min: 0,
                max: 100,
                subtype: 'percent'
              },
              {
                name: 'Sepia',
                id: 'sepia',
                type: 'range',
                value: this.state.sepia,
                min: 0,
                max: 100,
                subtype: 'percent'
              }
            ]}
          />
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

  componentDidUpdate(prevProps: Readonly<CProps>) {
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
