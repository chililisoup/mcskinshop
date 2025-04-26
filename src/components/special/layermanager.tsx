import React, { Component, ReactNode, RefObject } from 'react';
import * as ImgMod from '../../tools/imgmod';
import LayerEditor from './layereditor';
import ColorPicker from '../basic/colorpicker';
import DraggableWindow from '../basic/draggablewindow';
import PropertiesList, { Property } from '../basic/propertieslist';

type AProps = {
  layers: ImgMod.Layer;
  updateLayers: () => void;
  slim: boolean;
};

type AState = {
  selectedLayer?: string;
  insertingIndex?: number;
};

class LayerManager extends Component<AProps, AState> {
  managerRef: RefObject<HTMLDivElement | null> = React.createRef();

  constructor(props: AProps) {
    super(props);

    this.state = {
      selectedLayer: undefined,
      insertingIndex: undefined
    };
  }

  updateLayer = (index: number, newLayer: ImgMod.AbstractLayer) => {
    const oldLayer = this.props.layers.getLayers()[index];
    this.props.layers.replaceLayer(index, newLayer);

    if (oldLayer !== newLayer) oldLayer.cleanup();

    this.props.updateLayers();
  };

  moveLayer = (index: number, change: number) => {
    this.props.layers.moveLayer(index, change);
    this.props.updateLayers();
  };

  duplicateLayer = (index: number) => {
    this.props.layers.duplicateLayer(index);
    this.props.updateLayers();
  };

  removeLayer = (index: number) => {
    this.props.layers.removeLayer(index);
    this.props.updateLayers();
  };

  flattenLayer: (index: number) => void = async index => {
    await this.props.layers.flattenLayer(index);
    this.props.updateLayers();
  };

  mergeLayerDown = (index: number) => {
    if (index === 0) return;

    const mergedLayer = this.props.layers.mergeLayers(index, index - 1);
    if (!mergedLayer) return;

    this.props.updateLayers();
  };

  selectForEdit = (index: number) => {
    this.setState({ selectedLayer: this.props.layers.getLayer(index).id });
  };

  ungroup = (index: number) => {
    const changed = this.props.layers.separateLayer(index);
    if (changed) this.props.updateLayers();
  };

  addLayer: () => void = async () => {
    const layer = new ImgMod.Img();
    layer.name = 'New Layer';

    await layer.render();

    this.props.layers.addLayer(layer);
    this.props.updateLayers();
  };

  onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('application/mcss-layer')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!this.managerRef.current) return;

    this.managerRef.current.classList.add('dragover');

    const children = this.managerRef.current.children;
    if (children.length < 1) return;

    let closestDist: undefined | number = undefined;
    let index = 0;

    const checkDist = (y: number, i: number) => {
      const dist = Math.abs(e.clientY - y);
      if (closestDist === undefined || dist < closestDist) {
        closestDist = dist;
        index = i;
      }
    };

    let indexOffset = 0;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.tagName === 'HR') {
        indexOffset++;
        continue;
      }

      const rect = child.getBoundingClientRect();
      checkDist(rect.top, i + 1 - indexOffset);
      checkDist(rect.bottom, i - indexOffset);
    }

    if (index !== this.state.insertingIndex) this.setState({ insertingIndex: index });
  };

  onDragLeave = () => {
    this.managerRef.current?.classList.remove('dragover');
  };

  onDragEnd = () => {
    this.onDragLeave();
    if (this.state.insertingIndex !== undefined) this.setState({ insertingIndex: undefined });
  };

  onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (this.state.insertingIndex === undefined) return this.onDragLeave();

    const from = parseInt(e.dataTransfer.getData('application/mcss-layer'));

    if (!Number.isNaN(from) && from >= 0 && from < this.props.layers.getLayers().length) {
      const to =
        this.state.insertingIndex > from
          ? this.state.insertingIndex - 1
          : this.state.insertingIndex;

      if (from !== to) this.moveLayer(from, to - from);
    }

    this.onDragEnd();
  };

  render() {
    let elem: React.JSX.Element | React.JSX.Element[] = <div />;

    if (this.props.layers.getLayers().length) {
      elem = this.props.layers
        .getLayers()
        .map((asset, i) => (
          <Layer
            key={asset.id}
            asset={asset}
            index={i}
            updateLayer={this.updateLayer}
            duplicateLayer={this.duplicateLayer}
            removeLayer={this.removeLayer}
            flattenLayer={this.flattenLayer}
            mergeLayerDown={this.mergeLayerDown}
            selectForEdit={this.selectForEdit}
            ungroup={this.ungroup}
          />
        ));

      if (this.state.insertingIndex !== undefined)
        elem.splice(this.state.insertingIndex, 0, <hr key="INSERT_SPLITTER" />);
    } else if (this.state.insertingIndex !== undefined) elem = [<hr key="INSERT_SPLITTER" />];

    let selectedLayer = null;
    let selectedLayerIndex = null;
    for (let i = 0; i < this.props.layers.getLayers().length; i++) {
      if (this.props.layers.getLayers()[i].id === this.state.selectedLayer) {
        selectedLayer = this.props.layers.getLayers()[i];
        selectedLayerIndex = i;
        break;
      }
    }

    return (
      <div>
        <div className="LayerManager">
          <div
            className="container layer-manager"
            onDragEnter={this.onDragOver}
            onDragOver={this.onDragOver}
            onDragLeave={this.onDragLeave}
            onDragEnd={this.onDragEnd}
            onDrop={this.onDrop}
            ref={this.managerRef}
          >
            {elem}
          </div>
          <button onClick={this.addLayer}>New Layer</button>
        </div>
        {selectedLayerIndex !== null && selectedLayer instanceof ImgMod.Img && (
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
  duplicateLayer: (index: number) => void;
  removeLayer: (index: number) => void;
  flattenLayer: (index: number) => void;
  mergeLayerDown: (index: number) => void;
  selectForEdit: (index: number) => void;
  ungroup: (index: number) => void;
};

type BState = {
  editingName: boolean;
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
  layerRef: RefObject<HTMLDivElement | null> = React.createRef();

  constructor(props: BProps) {
    super(props);

    this.state = {
      editingName: false,
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

    this.props.asset.setColor(colorIndex, color);
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

  onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/mcss-layer', String(this.props.index));

    this.layerRef.current?.classList.add('dragging');
  };

  onDragEnd = () => {
    this.layerRef.current?.classList.remove('dragging');
  };

  render() {
    const colors: ReactNode[] = [];
    if (this.props.asset instanceof ImgMod.Layer) {
      const layer = this.props.asset;

      layer.getColors().forEach((color, i) => {
        if (!layer.advanced || !layer.advanced[i] || this.state.fxOpen) {
          if (typeof color === 'string')
            colors.push(
              <ColorPicker
                key={i + (layer.id ?? '')}
                default={color}
                update={color => this.changeColor(i, color)}
              />
            );
          else if (typeof color === 'object' && !('copy' in color))
            colors.push(
              <ColorPicker
                key={i + (layer.id ?? '')}
                default={layer.getTrueColor(i)}
                linked={true}
                unlink={() => {
                  layer.setColor(i, layer.getTrueColor(i));
                  this.updateLayer();
                }}
              />
            );
        }
      });
    }

    const properties: Property[] = [
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
    ];

    if (this.props.asset instanceof ImgMod.Img)
      properties.push(
        {
          name: 'Type',
          id: 'type',
          type: 'select',
          value: this.props.asset.type,
          options: [
            ['normal', 'Normal'],
            ['erase', 'Erase'],
            ['flatten', 'Flatten'],
            ['blowup', 'Blowup']
          ]
        },
        {
          name: 'Form',
          id: 'form',
          type: 'select',
          value: this.props.asset.form,
          options: [
            ['universal', 'Universal'],
            ['full-squish-inner', 'Full Squish - Inner'],
            ['full-squish-outer', 'Full Squish - Outer'],
            ['full-squish-average', 'Full Squish - Average'],
            ['slim-stretch', 'Slim Stretch'],
            ['full-only', 'Full Only'],
            ['slim-only', 'Slim Only']
          ]
        }
      );

    return (
      <div
        className="manager-layer container"
        draggable={true}
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
        ref={this.layerRef}
      >
        <span className="layerTitle">
          <input
            type="checkbox"
            title="Toggle Layer Visibility"
            checked={this.props.asset.active}
            onChange={() => this.toggleActive()}
          />
          {!this.state.editingName && (
            <p onDoubleClick={() => this.setState({ editingName: true })}>
              {this.props.asset.name ?? ''}
            </p>
          )}
          {this.state.editingName && (
            <input
              type="text"
              autoFocus={true}
              value={this.props.asset.name ?? ''}
              onChange={e => this.renameLayer(e.target.value)}
              onFocus={e => e.target.select()}
              onBlur={() => this.setState({ editingName: false })}
              onKeyDown={e => {
                if (e.key === 'Enter') this.setState({ editingName: false });
              }}
            />
          )}
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
        <hr />
        <span>
          <LayerPreview asset={this.props.asset} />
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
              if (id === 'type' && this.props.asset instanceof ImgMod.Img) {
                this.props.asset.type = value as ImgMod.LayerType;
                this.updateLayer();
              }
              if (id === 'form' && this.props.asset instanceof ImgMod.Img) {
                this.props.asset.form = value as ImgMod.LayerForm;
                this.updateLayer();
              }
            }}
            properties={properties}
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
