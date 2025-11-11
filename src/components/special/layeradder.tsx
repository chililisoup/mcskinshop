import React, { Component } from 'react';
import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import steve from '@assets/steve.png';
import JSZip from 'jszip';
import Dropdown from '@components/basic/dropdown';
import SkinManager from '@tools/skinman';

const fakedatabase = await Util.getRemoteJson('/assets/compressed/fake_database.json');

/*

type AssetLayer =
  | {
      path: string;
      color?:
        | ImgMod.Color
        | ImgMod.UnloadedRelativeColor
        | (ImgMod.Color | ImgMod.UnloadedRelativeColor)[];
      type?: ImgMod.LayerType;
      form?: ImgMod.LayerForm;
      maskFormat?: 'grayscale' | 'alpha'; // default is grayscale
    }
  | string;

type Asset = {
  name: string;
  layers: AssetLayer | AssetLayer[];
};

*/

type AProps = {
  addDefaultLayer: () => void;
};

type AState = {
  packs: string[];
};

export default class LayerAdder extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    this.state = {
      packs: []
    };
  }

  componentDidMount() {
    this.loadAssetPacks();
  }

  loadAssetPacks = () => {
    if (!(fakedatabase && Array.isArray(fakedatabase))) return;

    this.setState({ packs: fakedatabase.filter(name => typeof name === 'string') });
  };

  render() {
    let elem: React.ReactNode = <div />;
    if (this.state.packs.length) {
      elem = this.state.packs.map(name => (
        <Dropdown title={name}>
          <AssetPack name={name} addLayer={SkinManager.addLayer} />
        </Dropdown>
      ));
    }

    return (
      <div className="layer-adder">
        <div className="layer-adder-content">
          {elem}
          <Dropdown title="Default">
            <div className="container">
              <span>
                <img src={steve} alt="Steve & Alex" title="Steve & Alex" />
                <div>
                  <p>Steve & Alex</p>
                  <button onClick={this.props.addDefaultLayer}>+</button>
                </div>
              </span>
            </div>
          </Dropdown>
        </div>
      </div>
    );
  }
}

type BProps = {
  name: string;
  addLayer: (layer: ImgMod.AbstractLayer) => void;
};

type BState = {
  assets: ImgMod.Layer[];
};

class AssetPack extends Component<BProps, BState> {
  constructor(props: BProps) {
    super(props);

    this.state = {
      assets: []
    };
  }

  componentDidMount() {
    this.loadAssetPack();
  }

  parseColor: (color: unknown) => ImgMod.Color | ImgMod.UnloadedRelativeColor = color => {
    if (!color) return;
    if (typeof color === 'string') return color;
    if (typeof color !== 'object') return;

    if ('from' in color && typeof color.from === 'number') {
      if (
        'offset' in color &&
        Array.isArray(color.offset) &&
        color.offset.length === 4 &&
        !color.offset.find(value => typeof value !== 'number')
      )
        return { from: color.from, offset: color.offset as ImgMod.Hsla };
      else if ('to' in color && typeof color.to === 'string')
        return {
          from: color.from,
          to: color.to
        };
    }

    if ('copy' in color && typeof color.copy === 'number') return { copy: color.copy };
  };

  parseColors = (colors: unknown) => {
    if (Array.isArray(colors)) {
      if (colors.length === 0) return;
      if (colors.length === 1) return this.parseColor(colors[0]);
      return colors.map(this.parseColor);
    }
    return this.parseColor(colors);
  };

  loadAsset = async (path: string, name: string, zip: JSZip) => {
    const rawParams = await zip.file(`${path}asset.json`)?.async('text');
    if (!rawParams) throw new Error(`Failed to get asset.json from ${name}.zip/${path}`);

    const params: unknown = JSON.parse(rawParams);

    if (
      !(
        params &&
        typeof params === 'object' &&
        'name' in params &&
        typeof params.name === 'string' &&
        'layers' in params
      )
    )
      throw new Error(`Malformed asset.json in ${name}.zip/${path}`);

    const assetLayers: ImgMod.AbstractLayer[] = [];
    const assetColors: (ImgMod.Color | ImgMod.UnloadedRelativeColor)[] = [];

    for (const layer of (Array.isArray(params.layers)
      ? params.layers
      : [params.layers]) as unknown[]) {
      if (typeof layer === 'string') {
        const imageBlob = await zip.file(path + layer)?.async('blob');
        if (!imageBlob) continue;

        const image = new ImgMod.Img();
        image.name = `${params.name}.${layer.split('.')[0]}`;
        await image.loadImage(imageBlob);

        assetLayers.push(image);
        assetColors.push(undefined);

        continue;
      }

      if (
        !(layer && typeof layer === 'object' && 'path' in layer && typeof layer.path === 'string')
      )
        continue;

      const imageBlob = await zip.file(path + layer.path)?.async('blob');
      if (!imageBlob) continue;

      const name = `${params.name}.${layer.path.split('.')[0]}`;

      const layerType =
        'type' in layer && ImgMod.LAYER_TYPES.find(type => type === layer.type)
          ? (layer.type as ImgMod.LayerType)
          : undefined;

      const layerForm =
        'form' in layer && ImgMod.LAYER_FORMS.find(form => form === layer.form)
          ? (layer.form as ImgMod.LayerForm)
          : undefined;

      const layerColor = 'color' in layer ? this.parseColors(layer.color) : undefined;

      if (Array.isArray(layerColor)) {
        const colorCount = layerColor.length - 1;

        for (let i = 0; i < layerColor.length; i++) {
          const color = this.parseColor(layerColor[i]);

          const image = new ImgMod.Img(layerType, layerForm);
          image.name = `${name}.${i + 1}`;
          image.linearOpacity = true;
          await image.loadImage(imageBlob);

          assetLayers.push(image);
          assetColors.push(color);

          await image.gradientMask(i / colorCount, colorCount);
        }

        continue;
      }

      const image = new ImgMod.Img(layerType, layerForm);
      image.name = name;
      await image.loadImage(imageBlob);

      if (
        layerType &&
        layerType !== 'normal' &&
        ('maskFormat' in layer ? layer.maskFormat !== 'alpha' : true)
      )
        await image.convertGrayscaleMask();

      assetLayers.push(image);
      assetColors.push(layerColor);
    }

    const asset = new ImgMod.Layer(assetLayers, assetColors);
    asset.name = params.name;
    await asset.color();
    await asset.render();
    return asset;
  };

  loadAssetPack: () => void = async () => {
    try {
      const response = await fetch(`/assets/compressed/${this.props.name}.zip`);
      if (!response.ok) throw new Error(`Response status: ${response.status}`);

      const zip = new JSZip();
      await zip.loadAsync(await response.blob());

      const paths: string[] = [];
      zip.forEach((path, file) => {
        if (!file.dir) return;
        paths.push(path);
      });

      const assets = await Promise.all(
        paths.map(path => this.loadAsset(path, this.props.name, zip))
      );

      this.setState({ assets: assets });
    } catch (error) {
      console.error(error);
    }
  };

  addLayer: (index: number) => void = async (index: number) =>
    this.props.addLayer(await this.state.assets[index].copy());

  render() {
    return (
      <div>
        {this.state.assets.map((asset, index) => (
          <div className="container" key={asset.name}>
            <span>
              <img src={asset.src} alt={asset.name} title={asset.name} />
              <div>
                <p>{asset.name}</p>
                <button onClick={this.addLayer.bind(this, index)}>+</button>
              </div>
            </span>
          </div>
        ))}
      </div>
    );
  }
}
