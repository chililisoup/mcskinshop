import React, { Component, useEffect, useState } from 'react';
import * as ImgMod from '@tools/imgmod';
import ColorPicker from '@components/basic/colorpicker';
import PropertiesList, { Property } from '@components/basic/propertieslist';
import { PreferenceManager } from '@tools/prefman';
import SkinManager, { useRoot, useSelected } from '@tools/skinman';

export default function LayerManager() {
  const root = useRoot();
  const selected = useSelected();

  function addLayer() {
    const layer = new ImgMod.Img();
    layer.name = 'New Layer';

    SkinManager.addLayer(layer);
    SkinManager.selectLayer(layer);
  }

  function addGroup() {
    const layer = new ImgMod.Layer();
    layer.name = 'New Group';

    SkinManager.addLayer(layer);
  }

  return (
    <div className="LayerManager">
      <LayerList layers={root} root={root} isRoot={true} selectedLayer={selected} />
      <span className="stretch">
        <button onClick={addLayer}>New Layer</button>
        <button onClick={addGroup}>New Group</button>
      </span>
    </div>
  );
}

type BProps = {
  layers: ImgMod.Layer;
  root: ImgMod.Layer;
  isRoot?: boolean;
  selectedLayer: ImgMod.AbstractLayer | null;
  path?: string;
};

type BState = {
  insertingIndex?: number;
};

class LayerList extends Component<BProps, BState> {
  listRef: React.RefObject<HTMLDivElement | null> = React.createRef();

  constructor(props: BProps) {
    super(props);

    this.state = {
      insertingIndex: undefined
    };
  }

  moveLayer = (index: number, change: number) => {
    this.props.layers.moveLayer(index, change);
    SkinManager.updateSkin();
  };

  duplicateLayer: (index: number) => void = async index => {
    await this.props.layers.duplicateLayer(index);
    SkinManager.updateSkin();
  };

  removeLayer = (index: number) => {
    this.props.layers.removeLayer(index);
    SkinManager.updateSkin();
  };

  flattenLayer: (index: number) => void = async index => {
    await this.props.layers.flattenLayer(index, SkinManager.getSlim());
    SkinManager.updateSkin();
  };

  mergeLayerDown = (index: number) => {
    if (index === 0) return;

    const mergedLayer = this.props.layers.mergeLayers(index, index - 1);
    if (!mergedLayer) return;

    SkinManager.updateSkin();
  };

  onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('application/mcss-layer')) e.dataTransfer.dropEffect = 'move';
    else if (e.dataTransfer.types.includes('Files')) e.dataTransfer.dropEffect = 'copy';
    else return;

    e.stopPropagation();
    e.preventDefault();

    if (!this.listRef.current) return;

    this.listRef.current.classList.add('dragover');

    const children = this.props.isRoot
      ? this.listRef.current.children.namedItem('root-layer-list')?.children
      : this.listRef.current.children;
    if (!children || children.length < 1) {
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

    const selected = SkinManager.getSelected();
    const layer = this.props.root.popLayer(fromPath);
    if (!layer) return;

    this.props.layers.insertLayer(insertingIndex, layer);
    if (selected === layer) SkinManager.selectLayer(layer);
    SkinManager.updateSkin();
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
      if (PreferenceManager.get().autosetImageForm)
        image.form(slim ? 'slim-stretch' : 'full-squish-inner');

      this.props.layers.insertLayer(insertingIndex, image);
      SkinManager.updateSkin();

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
    // if (Manager.get().autosetImageForm)
    //   image.form = slim ? 'slim-stretch' : 'full-squish-inner';

    this.props.layers.insertLayer(insertingIndex, layer);
    SkinManager.updateSkin();
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

  render() {
    const layers = this.props.layers
      .getLayers()
      .filter(layer => !(layer instanceof ImgMod.ImgPreview))
      .map((layer, i) => (
        <Layer
          key={'layer-' + layer.id}
          layer={layer}
          index={i}
          root={this.props.root}
          path={this.props.path}
          duplicateLayer={this.duplicateLayer}
          removeLayer={this.removeLayer}
          flattenLayer={this.flattenLayer}
          mergeLayerDown={this.mergeLayerDown}
          selectedLayer={this.props.selectedLayer}
        />
      ));

    let canRootAddRule = this.props.isRoot;
    if (
      this.state.insertingIndex !== undefined &&
      (!this.props.isRoot ||
        (this.state.insertingIndex > 0 && this.state.insertingIndex !== layers.length))
    ) {
      layers.splice(this.state.insertingIndex, 0, <hr key="insert-indicator" />);
      canRootAddRule = false;
    }

    return this.props.isRoot ? (
      <div
        className="container layer-list root-layer-list"
        onDragEnter={this.onDragOver}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
        onDragEnd={this.onDragEnd}
        onDrop={this.onDrop}
        ref={this.listRef}
      >
        {canRootAddRule && this.state.insertingIndex === layers.length && <hr />}
        <div className="container layer-list" id="root-layer-list">
          {layers}
        </div>
        {canRootAddRule && this.state.insertingIndex === 0 && <hr />}
      </div>
    ) : (
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
  duplicateLayer: (index: number) => void;
  removeLayer: (index: number) => void;
  flattenLayer: (index: number) => void;
  mergeLayerDown: (index: number) => void;
  selectedLayer: ImgMod.AbstractLayer | null;
};

type CState = Required<ImgMod.Filter> & {
  editingName: boolean;
  fxOpen: boolean;
  layersOpen: boolean;
};

class Layer extends Component<CProps, CState> {
  layerRef: React.RefObject<HTMLDivElement | null> = React.createRef();

  constructor(props: CProps) {
    super(props);

    const filter = ImgMod.AbstractLayer.defaultFilter(props.layer.copyFilter());

    this.state = {
      editingName: false,
      fxOpen: false,
      layersOpen: false,
      ...filter
    };
  }

  changeColor: (colorIndex: number, color: string) => void = async (colorIndex, color) => {
    if (!(this.props.layer instanceof ImgMod.Layer)) return;

    this.props.layer.setColor(colorIndex, color);
    await this.props.layer.color();
    SkinManager.updateSkin();
  };

  toggleActive = () => {
    this.props.layer.active = !this.props.layer.active;
    this.props.layer.markChanged();
    SkinManager.updateSkin();
  };

  changeBlendMode = (blend: GlobalCompositeOperation) => {
    if (!(this.props.layer instanceof ImgMod.Img)) return;

    this.props.layer.blend(blend);
    SkinManager.updateSkin();
  };

  updateFilter = <KKey extends keyof CState>(filter: KKey, value: number) => {
    this.setState({ [filter]: value } as Pick<CState, KKey>, () => {
      this.props.layer.filter({
        opacity: this.state.opacity,
        hue: this.state.hue,
        saturation: this.state.saturation,
        brightness: this.state.brightness,
        contrast: this.state.contrast,
        invert: this.state.invert,
        sepia: this.state.sepia
      });

      SkinManager.updateSkin();
    });
  };

  renameLayer = (name: string) => {
    this.props.layer.name = name;
    SkinManager.updateSkin();
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
    const colors: React.ReactNode[] = [];
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
                  SkinManager.updateSkin();
                }}
              />
            );
        }
      });
    }

    const properties: Property[] = [
      {
        name: 'Opacity',
        id: 'opacity',
        type: 'range',
        value: this.state.opacity,
        resetValue: ImgMod.DEFAULT_FILTER.opacity,
        min: 0,
        max: 100,
        subtype: 'percent'
      },
      {
        name: 'Hue',
        id: 'hue',
        type: 'range',
        value: this.state.hue,
        resetValue: ImgMod.DEFAULT_FILTER.hue,
        min: -180,
        max: 180,
        subtype: 'degrees'
      },
      {
        name: 'Saturation',
        id: 'saturation',
        type: 'range',
        value: this.state.saturation,
        resetValue: ImgMod.DEFAULT_FILTER.saturation,
        min: 0,
        max: 200,
        subtype: 'percent'
      },
      {
        name: 'Brightness',
        id: 'brightness',
        type: 'range',
        value: this.state.brightness,
        resetValue: ImgMod.DEFAULT_FILTER.brightness,
        min: 0,
        max: 200,
        subtype: 'percent'
      },
      {
        name: 'Contrast',
        id: 'contrast',
        type: 'range',
        value: this.state.contrast,
        resetValue: ImgMod.DEFAULT_FILTER.contrast,
        min: 0,
        max: 200,
        subtype: 'percent'
      },
      {
        name: 'Invert',
        id: 'invert',
        type: 'range',
        value: this.state.invert,
        resetValue: ImgMod.DEFAULT_FILTER.invert,
        min: 0,
        max: 100,
        subtype: 'percent'
      },
      {
        name: 'Sepia',
        id: 'sepia',
        type: 'range',
        value: this.state.sepia,
        resetValue: ImgMod.DEFAULT_FILTER.sepia,
        min: 0,
        max: 100,
        subtype: 'percent'
      }
    ];

    if (this.props.layer instanceof ImgMod.Img) {
      properties.unshift({
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
      });

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
    }

    return (
      <div
        className={`manager-layer container${this.props.selectedLayer === this.props.layer ? ' selected' : ''}`}
        draggable={true}
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
        onClick={e => {
          SkinManager.selectLayer(this.props.layer);
          e.stopPropagation();
        }}
        ref={this.layerRef}
      >
        <span className="layer-title">
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
              className="material-symbols-outlined"
            >
              {this.state.layersOpen ? 'folder_open' : 'folder'}
            </button>
          )}
          <button
            onClick={e => {
              this.setState({ fxOpen: !this.state.fxOpen });
              e.stopPropagation();
            }}
            className="material-symbols-outlined"
          >
            {this.state.fxOpen ? 'unfold_less' : 'unfold_more'}
          </button>
        </span>
        <hr />
        <span>
          <LayerPreview asset={this.props.layer} />
          <div className="manager-layer-buttons">
            <button
              onClick={e => {
                this.props.duplicateLayer(this.props.index);
                e.stopPropagation();
              }}
              title="Duplicate Layer"
              className="material-symbols-outlined"
            >
              content_copy
            </button>
            <button
              onClick={e => {
                this.props.removeLayer(this.props.index);
                e.stopPropagation();
              }}
              title="Delete Layer"
              className="delete-button material-symbols-outlined"
            >
              delete
            </button>
            <button
              onClick={e => {
                this.props.flattenLayer(this.props.index);
                e.stopPropagation();
              }}
              title="Flatten Layer"
              className="material-symbols-outlined"
            >
              vertical_align_center
            </button>
            <button
              onClick={e => {
                this.props.mergeLayerDown(this.props.index);
                e.stopPropagation();
              }}
              title="Merge Layer Down"
              className="material-symbols-outlined"
            >
              vertical_align_bottom
            </button>
            {colors}
          </div>
        </span>
        {this.state.layersOpen && this.props.layer instanceof ImgMod.Layer && (
          <div className="sublayers">
            <LayerList
              layers={this.props.layer}
              root={this.props.root}
              selectedLayer={this.props.selectedLayer}
              path={
                this.props.path ? `${this.props.path}-${this.props.index}` : `${this.props.index}`
              }
            />
          </div>
        )}
        {this.state.fxOpen && (
          <PropertiesList
            preventDrag={true}
            numberFallback={(id, value) => {
              if (id in this.state) this.updateFilter(id as keyof CState, value);
            }}
            stringFallback={(id, value) => {
              if (id === 'blend') this.changeBlendMode(value as GlobalCompositeOperation);
              if (id === 'type' && this.props.layer instanceof ImgMod.Img) {
                this.props.layer.type(value as ImgMod.LayerType);
                SkinManager.updateSkin();
              }
              if (id === 'form' && this.props.layer instanceof ImgMod.Img) {
                this.props.layer.form(value as ImgMod.LayerForm);
                SkinManager.updateSkin();
              }
            }}
            properties={properties}
          />
        )}
      </div>
    );
  }
}

function LayerPreview({ asset }: { asset: ImgMod.AbstractLayer }) {
  const [src, setSrc] = useState(ImgMod.EMPTY_IMAGE_SOURCE);
  const [alt, setAlt] = useState('');

  useEffect(updatePreview);

  function updatePreview() {
    setSrc(asset.src);
    setAlt(asset.name ?? '');
  }

  return <img src={src} alt={alt} title={alt} />;
}
