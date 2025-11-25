import React, { useRef, useState } from 'react';
import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import ColorPicker from '@components/basic/colorpicker';
import PropertiesList, { Property } from '@components/basic/propertieslist';
import { PreferenceManager } from '@tools/prefman';
import SkinManager, { useRoot, useSelected } from '@tools/skinman';

export default function LayerManager() {
  const root = useRoot();
  const selected = useSelected();

  function addLayer() {
    const layer = new ImgMod.Img();
    layer.name('New Layer');

    SkinManager.addLayer(layer);
    SkinManager.selectLayer(layer);
  }

  function addGroup() {
    const layer = new ImgMod.Layer();
    layer.name('New Group');

    SkinManager.addLayer(layer);
  }

  return (
    <div className="LayerManager">
      <LayerList parent={root} root={root} selectedLayer={selected} />
      <span className="stretch">
        <button onClick={addLayer}>New Layer</button>
        <button onClick={addGroup}>New Group</button>
      </span>
    </div>
  );
}

type BProps = {
  parent: ImgMod.Layer;
  root: ImgMod.Layer;
  selectedLayer: ImgMod.AbstractLayer | null;
};

function LayerList(props: BProps) {
  const [insertingIndex, setInsertingIndex] = useState(null as number | null);
  const layers = ImgMod.useLayerList(props.parent);
  const listRef = useRef(null as HTMLDivElement | null);
  const isRoot = props.parent === props.root;

  const moveLayer = (index: number, change: number, propagateChange?: boolean) =>
    props.parent.moveLayer(index, change, propagateChange);

  const duplicateLayer = async (index: number) => await props.parent.duplicateLayer(index);

  const removeLayer = (index: number) => props.parent.removeLayer(index);

  const flattenLayer = async (index: number) =>
    await props.parent.flattenLayer(index, SkinManager.getSlim());

  const mergeLayerDown = (index: number) => {
    if (index === 0) return;

    const mergedLayer = props.parent.mergeLayers(index, index - 1);
    if (!mergedLayer) return;
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('application/mcss-layer')) e.dataTransfer.dropEffect = 'move';
    else if (e.dataTransfer.types.includes('Files')) e.dataTransfer.dropEffect = 'copy';
    else return;

    e.stopPropagation();
    e.preventDefault();

    if (!listRef.current) return;

    listRef.current.classList.add('dragover');

    const children = isRoot
      ? listRef.current.children.namedItem('root-layer-list')?.children
      : listRef.current.children;
    if (!children || children.length < 1) return setInsertingIndex(0);

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

    if (index !== insertingIndex) setInsertingIndex(index);
  };

  const onDragLeave = () => listRef.current?.classList.remove('dragover');

  const onDragEnd = () => {
    onDragLeave();
    if (insertingIndex !== undefined) setInsertingIndex(null);
  };

  const onDropLayer = (from: string, insertingIndex: number) => {
    const fromPath = ImgMod.AbstractLayer.parsePathString(from);
    if (!fromPath) return;

    const layer = props.root.getLayerFromPath(fromPath);
    if (!layer || layer.layer === props.parent) return;

    if (layer.parent === props.parent) {
      const fromIndex = layer.index;
      const to = insertingIndex > fromIndex ? insertingIndex - 1 : insertingIndex;
      if (fromIndex !== to) moveLayer(fromIndex, to - fromIndex);

      return;
    }

    if (layer.layer instanceof ImgMod.Layer && props.parent.hasAncestor(layer.layer)) return;

    const selected = SkinManager.getSelected();
    layer.parent.removeLayer(layer.index); // will deselect layer if selected
    if (!layer) return;

    props.parent.insertLayer(insertingIndex, layer.layer);
    if (selected === layer.layer) SkinManager.selectLayer(layer.layer); // reselect
  };

  const onDropFiles = async (files: FileList, insertingIndex: number) => {
    const layers: ImgMod.AbstractLayer[] = [];

    // should probably send this up to skin manager cause
    // it's mostly the same as for single image uploads
    for (const file of files) {
      if (file.type.split('/')[0] !== 'image') continue;

      const image = new ImgMod.Img();
      image.name(file.name.replace(/\.[^/.]+$/, ''));

      await image.loadUrl(URL.createObjectURL(file));

      if (files.length > 1) {
        layers.push(image);
        continue;
      }

      const slim = image.detectSlimModel();
      if (PreferenceManager.get().autosetImageForm)
        image.form(slim ? 'slim-stretch' : 'full-squish-inner');

      props.parent.insertLayer(insertingIndex, image);

      return;
    }

    if (layers.length === 0) return;

    const layer = new ImgMod.Layer(layers);
    layer.name('Group import');

    await layer.render();

    // need to set up image forms for layers
    //
    // const image = new ImgMod.Img();
    // await image.render(layer.src);
    // const slim = image.detectSlimModel();
    // if (Manager.get().autosetImageForm)
    //   image.form = slim ? 'slim-stretch' : 'full-squish-inner';

    props.parent.insertLayer(insertingIndex, layer);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (insertingIndex === null) return onDragLeave();
    onDragEnd();

    if (e.dataTransfer.types.includes('application/mcss-layer'))
      onDropLayer(e.dataTransfer.getData('application/mcss-layer'), insertingIndex);
    else if (e.dataTransfer.types.includes('Files'))
      void onDropFiles(e.dataTransfer.files, insertingIndex);
    else return;

    e.stopPropagation();
    e.preventDefault();
  };

  const layerElements = layers
    .filter(layer => !(layer instanceof ImgMod.ImgPreview))
    .map((layer, i) => (
      <Layer
        key={'layer-' + layer.id}
        layer={layer}
        index={i}
        root={props.root}
        duplicateLayer={index => void duplicateLayer(index)}
        removeLayer={removeLayer}
        flattenLayer={index => void flattenLayer(index)}
        mergeLayerDown={mergeLayerDown}
        selectedLayer={props.selectedLayer}
      />
    ));

  let canRootAddRule = isRoot;
  if (
    insertingIndex !== null &&
    (!isRoot || (insertingIndex > 0 && insertingIndex !== layerElements.length))
  ) {
    layerElements.splice(insertingIndex, 0, <hr key="insert-indicator" />);
    canRootAddRule = false;
  }

  return isRoot ? (
    <div
      className="container layer-list root-layer-list"
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      ref={listRef}
    >
      {canRootAddRule && insertingIndex === layerElements.length && <hr />}
      <div className="container layer-list" id="root-layer-list">
        {layerElements}
      </div>
      {canRootAddRule && insertingIndex === 0 && <hr />}
    </div>
  ) : (
    <div
      className="container layer-list"
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      ref={listRef}
    >
      {layerElements}
    </div>
  );
}

type CProps = {
  layer: ImgMod.AbstractLayer;
  root: ImgMod.Layer;
  index: number;
  duplicateLayer: (index: number) => void;
  removeLayer: (index: number) => void;
  flattenLayer: (index: number) => void;
  mergeLayerDown: (index: number) => void;
  selectedLayer: ImgMod.AbstractLayer | null;
};

function Layer(props: CProps) {
  const [editingName, setEditingName] = useState(false);
  const [fxOpen, setFxOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const layerRef = useRef(null as HTMLDivElement | null);

  const layerInfo = ImgMod.useLayerInfo(props.layer);

  async function changeColor(colorIndex: number, color: string) {
    if (!(props.layer instanceof ImgMod.Layer)) return;

    props.layer.setColor(colorIndex, color);
    await props.layer.color();
  }

  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();

    const pathString = props.layer.buildPathString();
    if (!pathString) return;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/mcss-layer', pathString);

    layerRef.current?.classList.add('dragging');
  };

  const onDragEnd = () => layerRef.current?.classList.remove('dragging');

  const colors: React.ReactNode[] = [];
  if (props.layer instanceof ImgMod.Layer) {
    const layer = props.layer;

    layer.getColors().forEach((color, i) => {
      if (!layer.advanced || !layer.advanced[i] || fxOpen) {
        if (typeof color === 'string')
          colors.push(
            <ColorPicker
              key={i + (layer.id ?? '')}
              default={color}
              update={color => void changeColor(i, color)}
              alpha={true}
            />
          );
        else if (typeof color === 'object' && !('copy' in color))
          colors.push(
            <ColorPicker
              key={i + (layer.id ?? '')}
              default={layer.getTrueColor(i)}
              linked={true}
              unlink={() => layer.setColor(i, layer.getTrueColor(i))}
            />
          );
      }
    });
  }

  return (
    <div
      className={`manager-layer container${props.selectedLayer === props.layer ? ' selected' : ''}`}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={e => {
        SkinManager.selectLayer(props.layer);
        e.stopPropagation();
      }}
      ref={layerRef}
    >
      <span className="layer-title">
        <input
          type="checkbox"
          title="Toggle Layer Visibility"
          checked={layerInfo.active}
          onChange={props.layer.toggleActive}
          onClick={e => e.stopPropagation()}
        />
        {!editingName && <p onDoubleClick={() => setEditingName(true)}>{layerInfo.name}</p>}
        {editingName && (
          <input
            type="text"
            autoFocus={true}
            value={layerInfo.name}
            onChange={e => props.layer.name(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={() => setEditingName(false)}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
          />
        )}
        {props.layer instanceof ImgMod.Img && props.layer.dynamic && (
          <button disabled>Edit in external editor</button>
        )}
        {props.layer instanceof ImgMod.Layer && (
          <button
            onClick={e => {
              setLayersOpen(!layersOpen);
              e.stopPropagation();
            }}
            className="material-symbols-outlined"
          >
            {layersOpen ? 'folder_open' : 'folder'}
          </button>
        )}
        <button
          onClick={e => {
            setFxOpen(!fxOpen);
            e.stopPropagation();
          }}
          className="material-symbols-outlined"
        >
          {fxOpen ? 'unfold_less' : 'unfold_more'}
        </button>
      </span>
      <hr />
      <span>
        <img src={layerInfo.src} alt={layerInfo.name} title={layerInfo.name} />
        <div className="manager-layer-buttons">
          <button
            onClick={e => {
              props.duplicateLayer(props.index);
              e.stopPropagation();
            }}
            title="Duplicate Layer"
            className="material-symbols-outlined"
          >
            content_copy
          </button>
          <button
            onClick={e => {
              props.removeLayer(props.index);
              e.stopPropagation();
            }}
            title="Delete Layer"
            className="delete-button material-symbols-outlined"
          >
            delete
          </button>
          <button
            onClick={e => {
              props.flattenLayer(props.index);
              e.stopPropagation();
            }}
            title="Flatten Layer"
            className="material-symbols-outlined"
          >
            vertical_align_center
          </button>
          <button
            onClick={e => {
              props.mergeLayerDown(props.index);
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
      {layersOpen && props.layer instanceof ImgMod.Layer && (
        <div className="sublayers">
          <LayerList parent={props.layer} root={props.root} selectedLayer={props.selectedLayer} />
        </div>
      )}
      {fxOpen && <LayerFX layer={props.layer} />}
    </div>
  );
}

function LayerFX({ layer }: { layer: ImgMod.AbstractLayer }) {
  const layerInfo = ImgMod.useLayerInfo(layer);

  const properties: Property[] = [
    {
      name: 'Opacity',
      id: 'opacity',
      type: 'range',
      value: layerInfo.filter.opacity,
      resetValue: ImgMod.DEFAULT_FILTER.opacity,
      min: 0,
      max: 100,
      subtype: 'percent'
    },
    {
      name: 'Hue',
      id: 'hue',
      type: 'range',
      value: layerInfo.filter.hue,
      resetValue: ImgMod.DEFAULT_FILTER.hue,
      min: -180,
      max: 180,
      subtype: 'degrees'
    },
    {
      name: 'Saturation',
      id: 'saturation',
      type: 'range',
      value: layerInfo.filter.saturation,
      resetValue: ImgMod.DEFAULT_FILTER.saturation,
      min: 0,
      max: 200,
      subtype: 'percent'
    },
    {
      name: 'Brightness',
      id: 'brightness',
      type: 'range',
      value: layerInfo.filter.brightness,
      resetValue: ImgMod.DEFAULT_FILTER.brightness,
      min: 0,
      max: 200,
      subtype: 'percent'
    },
    {
      name: 'Contrast',
      id: 'contrast',
      type: 'range',
      value: layerInfo.filter.contrast,
      resetValue: ImgMod.DEFAULT_FILTER.contrast,
      min: 0,
      max: 200,
      subtype: 'percent'
    },
    {
      name: 'Invert',
      id: 'invert',
      type: 'range',
      value: layerInfo.filter.invert,
      resetValue: ImgMod.DEFAULT_FILTER.invert,
      min: 0,
      max: 100,
      subtype: 'percent'
    },
    {
      name: 'Sepia',
      id: 'sepia',
      type: 'range',
      value: layerInfo.filter.sepia,
      resetValue: ImgMod.DEFAULT_FILTER.sepia,
      min: 0,
      max: 100,
      subtype: 'percent'
    }
  ];

  if (layer instanceof ImgMod.Img) {
    properties.unshift({
      name: 'Blend Mode',
      id: 'blend',
      type: 'select',
      value: layerInfo.blend,
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
        value: layerInfo.type,
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
        value: layerInfo.form,
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
    <PropertiesList
      preventDrag={true}
      numberFallback={(id, value) =>
        Util.isKeyOfObject(id, ImgMod.DEFAULT_FILTER) && layer.filter({ [id]: value })
      }
      stringFallback={(id, value) => {
        if (!(layer instanceof ImgMod.Img)) return;
        if (id === 'blend') layer.blend(value as GlobalCompositeOperation);
        if (id === 'type') layer.type(value as ImgMod.LayerType);
        if (id === 'form') layer.form(value as ImgMod.LayerForm);
      }}
      properties={properties}
    />
  );
}
