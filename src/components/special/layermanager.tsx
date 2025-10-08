import React, { Component, ReactNode, RefObject } from 'react';
import * as ImgMod from '@tools/imgmod';
import * as PrefMan from '@tools/prefman';
import ColorPicker from '@components/basic/colorpicker';
import PropertiesList, { Property } from '@components/basic/propertieslist';

type AProps = {
  layers: ImgMod.Layer;
  updateSkin: (slim?: boolean) => void;
  slim: boolean;
  manager: PrefMan.Manager;
  selectForEdit: (layer: ImgMod.AbstractLayer, parent: ImgMod.Layer) => void;
  selectedLayer?: ImgMod.AbstractLayer;
};

export default class LayerManager extends Component<AProps> {
  constructor(props: AProps) {
    super(props);

    this.state = {
      selectedLayer: undefined
    };
  }

  addLayer = () => {
    const layer = new ImgMod.Img();
    layer.name = 'New Layer';

    this.props.layers.addLayer(layer);
    this.props.updateSkin();
  };

  addGroup = () => {
    const layer = new ImgMod.Layer();
    layer.name = 'New Group';

    this.props.layers.addLayer(layer);
    this.props.updateSkin();
  };

  render() {
    return (
      <div className="LayerManager">
        <LayerList
          layers={this.props.layers}
          root={this.props.layers}
          manager={this.props.manager}
          updateSkin={this.props.updateSkin}
          selectForEdit={this.props.selectForEdit}
          selectedLayer={this.props.selectedLayer}
        />
        <span className="stretch">
          <button onClick={this.addLayer}>New Layer</button>
          <button onClick={this.addGroup}>New Group</button>
        </span>
      </div>
    );
  }
}

type BProps = {
  layers: ImgMod.Layer;
  root: ImgMod.Layer;
  manager: PrefMan.Manager;
  updateSkin: () => void;
  selectForEdit: (layer: ImgMod.AbstractLayer, parent: ImgMod.Layer) => void;
  selectedLayer?: ImgMod.AbstractLayer;
  path?: string;
};

type BState = {
  insertingIndex?: number;
};

class LayerList extends Component<BProps, BState> {
  listRef: RefObject<HTMLDivElement | null> = React.createRef();

  constructor(props: BProps) {
    super(props);

    this.state = {
      insertingIndex: undefined
    };
  }

  moveLayer = (index: number, change: number) => {
    this.props.layers.moveLayer(index, change);
    this.props.updateSkin();
  };

  duplicateLayer: (index: number) => void = async index => {
    await this.props.layers.duplicateLayer(index);
    this.props.updateSkin();
  };

  removeLayer = (index: number) => {
    this.props.layers.removeLayer(index);
    this.props.updateSkin();
  };

  flattenLayer: (index: number) => void = async index => {
    await this.props.layers.flattenLayer(index);
    this.props.updateSkin();
  };

  mergeLayerDown = (index: number) => {
    if (index === 0) return;

    const mergedLayer = this.props.layers.mergeLayers(index, index - 1);
    if (!mergedLayer) return;

    this.props.updateSkin();
  };

  onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('application/mcss-layer')) e.dataTransfer.dropEffect = 'move';
    else if (e.dataTransfer.types.includes('Files')) e.dataTransfer.dropEffect = 'copy';
    else return;

    e.stopPropagation();
    e.preventDefault();

    if (!this.listRef.current) return;

    this.listRef.current.classList.add('dragover');

    const children = this.listRef.current.children;
    if (children.length < 1) {
      this.setState({ insertingIndex: 0 });
      return;
    }

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
    this.listRef.current?.classList.remove('dragover');
  };

  onDragEnd = () => {
    this.onDragLeave();
    if (this.state.insertingIndex !== undefined) this.setState({ insertingIndex: undefined });
  };

  onDropLayer = (from: string, insertingIndex: number) => {
    const fromPath = from.split('-');

    if (this.props.path === undefined || from.startsWith(this.props.path)) {
      const thisPath = this.props.path ? this.props.path.split('-') : [];
      if (thisPath.length === fromPath.length - 1) {
        const fromIndex = parseInt(fromPath[fromPath.length - 1]);

        if (
          Number.isNaN(fromIndex) ||
          fromIndex < 0 ||
          fromIndex >= this.props.layers.getLayers().length
        )
          return;

        const to = insertingIndex > fromIndex ? insertingIndex - 1 : insertingIndex;
        if (fromIndex !== to) this.moveLayer(fromIndex, to - fromIndex);

        return;
      }
    }

    if (this.props.path?.startsWith(from)) return;

    const layer = this.props.root.popLayer(fromPath);
    if (!layer) return;

    this.props.layers.insertLayer(insertingIndex, layer);
  };

  onDropFiles: (files: FileList, insertingIndex: number) => void = async (
    files,
    insertingIndex
  ) => {
    const layers: ImgMod.AbstractLayer[] = [];

    // should probably send this up to skin manager cause
    // it's mostly the same as for single image uploads
    for (const file of files) {
      if (file.type.split('/')[0] !== 'image') continue;

      const image = new ImgMod.Img();
      image.name = file.name.replace(/\.[^/.]+$/, '');

      await image.loadUrl(URL.createObjectURL(file));

      if (files.length > 1) {
        layers.push(image);
        continue;
      }

      const slim = image.detectSlimModel();
      if (this.props.manager.get().autosetImageForm)
        image.form(slim ? 'slim-stretch' : 'full-squish-inner');

      this.props.layers.insertLayer(insertingIndex, image);
      this.props.updateSkin();

      return;
    }

    if (layers.length === 0) return;

    const layer = new ImgMod.Layer(layers);
    layer.name = 'Group import';

    await layer.render();

    // need to set up image forms for layers
    //
    // const image = new ImgMod.Img();
    // await image.render(layer.src);
    // const slim = image.detectSlimModel();
    // if (this.props.manager.get().autosetImageForm)
    //   image.form = slim ? 'slim-stretch' : 'full-squish-inner';

    this.props.layers.insertLayer(insertingIndex, layer);
    this.props.updateSkin();
  };

  onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (this.state.insertingIndex === undefined) return this.onDragLeave();
    this.onDragEnd();

    if (e.dataTransfer.types.includes('application/mcss-layer'))
      this.onDropLayer(e.dataTransfer.getData('application/mcss-layer'), this.state.insertingIndex);
    else if (e.dataTransfer.types.includes('Files'))
      this.onDropFiles(e.dataTransfer.files, this.state.insertingIndex);
    else return;

    e.stopPropagation();
    e.preventDefault();
  };

  selectForEdit = (layer: ImgMod.AbstractLayer, parent?: ImgMod.Layer) => {
    this.props.selectForEdit(layer, parent ?? this.props.layers);
  };

  render() {
    const layers = this.props.layers
      .getLayers()
      .filter(layer => !(layer instanceof ImgMod.ImgPreview))
      .map((layer, i) => (
        <Layer
          key={layer.id}
          layer={layer}
          index={i}
          root={this.props.root}
          path={this.props.path}
          manager={this.props.manager}
          updateLayer={this.props.updateSkin}
          duplicateLayer={this.duplicateLayer}
          removeLayer={this.removeLayer}
          flattenLayer={this.flattenLayer}
          mergeLayerDown={this.mergeLayerDown}
          selectForEdit={this.selectForEdit}
          selectedLayer={this.props.selectedLayer}
        />
      ));

    if (this.state.insertingIndex !== undefined)
      layers.splice(this.state.insertingIndex, 0, <hr />);

    return (
      <div
        className="container layer-list"
        onDragEnter={this.onDragOver}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
        onDragEnd={this.onDragEnd}
        onDrop={this.onDrop}
        ref={this.listRef}
      >
        {layers}
      </div>
    );
  }
}

type CProps = {
  layer: ImgMod.AbstractLayer;
  root: ImgMod.Layer;
  index: number;
  path?: string;
  manager: PrefMan.Manager;
  updateLayer: () => void;
  duplicateLayer: (index: number) => void;
  removeLayer: (index: number) => void;
  flattenLayer: (index: number) => void;
  mergeLayerDown: (index: number) => void;
  selectForEdit: (layer: ImgMod.AbstractLayer, parent?: ImgMod.Layer) => void;
  selectedLayer?: ImgMod.AbstractLayer;
};

type CState = {
  editingName: boolean;
  fxOpen: boolean;
  layersOpen: boolean;
  opacity: number;
  hue: number;
  saturation: number;
  brightness: number;
  contrast: number;
  invert: number;
  sepia: number;
};

class Layer extends Component<CProps, CState> {
  layerRef: RefObject<HTMLDivElement | null> = React.createRef();

  constructor(props: CProps) {
    super(props);

    this.state = {
      editingName: false,
      fxOpen: false,
      layersOpen: false,
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
    if (!(this.props.layer instanceof ImgMod.Layer)) return;

    this.props.layer.setColor(colorIndex, color);
    await this.props.layer.color();
    this.props.updateLayer();
  };

  toggleActive = () => {
    this.props.layer.active = !this.props.layer.active;
    this.props.layer.markChanged();
    this.props.updateLayer();
  };

  changeBlendMode = (blend: GlobalCompositeOperation) => {
    this.props.layer.blend(blend);
    this.props.updateLayer();
  };

  updateFilter = <KKey extends keyof CState>(filter: KKey, value: number) => {
    this.setState({ [filter]: value } as Pick<CState, KKey>, () => {
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

      this.props.layer.filter(filterString);
      this.props.updateLayer();
    });
  };

  renameLayer = (name: string) => {
    this.props.layer.name = name;
    this.props.updateLayer();
  };

  onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'application/mcss-layer',
      this.props.path ? `${this.props.path}-${this.props.index}` : `${this.props.index}`
    );

    this.layerRef.current?.classList.add('dragging');
  };

  onDragEnd = () => {
    this.layerRef.current?.classList.remove('dragging');
  };

  render() {
    const colors: ReactNode[] = [];
    if (this.props.layer instanceof ImgMod.Layer) {
      const layer = this.props.layer;

      layer.getColors().forEach((color, i) => {
        if (!layer.advanced || !layer.advanced[i] || this.state.fxOpen) {
          if (typeof color === 'string')
            colors.push(
              <ColorPicker
                key={i + (layer.id ?? '')}
                default={color}
                update={color => this.changeColor(i, color)}
                alpha={true}
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
                  this.props.updateLayer();
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
        value: this.props.layer.blend(),
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

    if (this.props.layer instanceof ImgMod.Img)
      properties.push(
        {
          name: 'Type',
          id: 'type',
          type: 'select',
          value: this.props.layer.type(),
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
          value: this.props.layer.form(),
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
        className={`manager-layer container${this.props.selectedLayer === this.props.layer ? ' selected' : ''}`}
        draggable={true}
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
        onClick={e => {
          this.props.selectForEdit(this.props.layer);
          e.stopPropagation();
        }}
        ref={this.layerRef}
      >
        <span className="layerTitle">
          <input
            type="checkbox"
            title="Toggle Layer Visibility"
            checked={this.props.layer.active}
            onChange={() => this.toggleActive()}
            onClick={e => e.stopPropagation()}
          />
          {!this.state.editingName && (
            <p onDoubleClick={() => this.setState({ editingName: true })}>
              {this.props.layer.name ?? ''}
            </p>
          )}
          {this.state.editingName && (
            <input
              type="text"
              autoFocus={true}
              value={this.props.layer.name ?? ''}
              onChange={e => this.renameLayer(e.target.value)}
              onFocus={e => e.target.select()}
              onBlur={() => this.setState({ editingName: false })}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter') this.setState({ editingName: false });
              }}
            />
          )}
          {this.props.layer instanceof ImgMod.Img && this.props.layer.dynamic && (
            <button disabled>Edit in external editor</button>
          )}
          {this.props.layer instanceof ImgMod.Layer && (
            <button
              onClick={e => {
                this.setState({ layersOpen: !this.state.layersOpen });
                e.stopPropagation();
              }}
            >
              {this.state.layersOpen ? '📂' : '📁'}
            </button>
          )}
          <button
            onClick={e => {
              this.setState({ fxOpen: !this.state.fxOpen });
              e.stopPropagation();
            }}
          >
            {this.state.fxOpen ? '/\\' : '\\/'}
          </button>
        </span>
        <hr />
        <span>
          <LayerPreview asset={this.props.layer} />
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
        {this.state.layersOpen && this.props.layer instanceof ImgMod.Layer && (
          <div className="sublayers">
            <LayerList
              layers={this.props.layer}
              root={this.props.root}
              updateSkin={this.props.updateLayer}
              selectForEdit={this.props.selectForEdit}
              selectedLayer={this.props.selectedLayer}
              manager={this.props.manager}
              path={
                this.props.path ? `${this.props.path}-${this.props.index}` : `${this.props.index}`
              }
            />
          </div>
        )}
        {this.state.fxOpen && (
          <PropertiesList
            numberCallback={(id, value) => {
              if (id in this.state) this.updateFilter(id as keyof CState, value);
            }}
            stringCallback={(id, value) => {
              if (id === 'blend') this.changeBlendMode(value as GlobalCompositeOperation);
              if (id === 'type' && this.props.layer instanceof ImgMod.Img) {
                this.props.layer.type(value as ImgMod.LayerType);
                this.props.updateLayer();
              }
              if (id === 'form' && this.props.layer instanceof ImgMod.Img) {
                this.props.layer.form(value as ImgMod.LayerForm);
                this.props.updateLayer();
              }
            }}
            properties={properties}
          />
        )}
      </div>
    );
  }
}

type DProps = {
  asset: ImgMod.AbstractLayer;
};

type DState = {
  src?: string;
  alt: string;
};

class LayerPreview extends Component<DProps, DState> {
  constructor(props: DProps) {
    super(props);

    this.state = {
      src: undefined,
      alt: ''
    };
  }

  componentDidMount() {
    this.updatePreview();
  }

  componentDidUpdate(prevProps: Readonly<DProps>) {
    if (prevProps !== this.props) this.updatePreview();
  }

  updatePreview = () => {
    this.setState({ src: this.props.asset.src, alt: this.props.asset.name ?? '' });
  };

  render() {
    return <img src={this.state.src} alt={this.state.alt} title={this.state.alt} />;
  }
}
