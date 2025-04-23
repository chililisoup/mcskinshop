import React, { Component, ReactNode } from 'react';
import * as ImgMod from '../../tools/imgmod';
import * as Util from '../../tools/util';
import JSZip from 'jszip';

const fakedatabase = await Util.getRemoteJson('/assets/compressed/fake_database.json');

type AProps = {
  addLayer: (layer: ImgMod.AbstractLayer) => void;
};

type AState = {
  assets: ImgMod.Layer[];
};

class LayerAdder extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    this.state = {
      assets: []
    };
  }

  componentDidMount() {
    this.loadAssets();
  }

  addLayer = (id: number) => {
    const layer = this.state.assets[id].copy();
    layer.id = Util.randomKey();
    this.props.addLayer(layer);
  };

  loadAssets: () => void = async () => {
    if (!(fakedatabase && Array.isArray(fakedatabase))) return;

    const layers = await Promise.all(
      fakedatabase.map(async name => {
        const asset = new ImgMod.Layer();
        if (typeof name !== 'string') return asset;

        try {
          const response = await fetch(`/assets/compressed/${name}.zip`);
          if (!response.ok) throw new Error(`Response status: ${response.status}`);

          const zip = new JSZip();
          await zip.loadAsync(await response.blob());
          const rawParams = await zip.file('asset.json')?.async('text');
          if (!rawParams) throw new Error(`Failed to get asset.json from ${name}.zip`);

          const params: unknown = JSON.parse(rawParams);

          if (
            !(
              params &&
              typeof params === 'object' &&
              'name' in params &&
              typeof params.name === 'string' &&
              'layers' in params &&
              Array.isArray(params.layers)
            )
          )
            throw new Error(`Malformed asset.json in ${name}.zip`);

          asset.name = params.name;

          for (const layer of params.layers as unknown[]) {
            if (
              !(
                layer &&
                typeof layer === 'object' &&
                'path' in layer &&
                typeof layer.path === 'string'
              )
            )
              continue;

            const imageBlob = await zip.file(layer.path)?.async('blob');
            if (!imageBlob) continue;

            const name = `${asset.name}.${layer.path.split('.')[0]}`;

            const layerForm =
              'form' in layer && ImgMod.LAYER_FORMS.find(form => form === layer.form)
                ? (layer.form as ImgMod.LayerForm)
                : undefined;

            if ('colors' in layer && Array.isArray(layer.colors)) {
              asset.colors = [];
              const colorCount = layer.colors.length - 1;

              for (let i = 0; i < layer.colors.length; i++) {
                const color: unknown = layer.colors[i];
                if (typeof color !== 'string') {
                  if (
                    !(
                      color &&
                      typeof color === 'object' &&
                      'from' in color &&
                      typeof color.from === 'number'
                    )
                  )
                    continue;

                  if (
                    'offset' in color &&
                    Array.isArray(color.offset) &&
                    color.offset.length === 4 &&
                    !color.offset.find(value => typeof value !== 'number')
                  )
                    asset.colors.push({ from: color.from, offset: color.offset as ImgMod.Hsla });
                  if ('to' in color && typeof color.to === 'string') {
                    const from: unknown = layer.colors[color.from];
                    if (typeof from !== 'string') continue;
                    asset.colors.push({
                      from: color.from,
                      offset: ImgMod.getHslaOffset(
                        ImgMod.colorAsHsla(from),
                        ImgMod.colorAsHsla(color.to)
                      )
                    });
                  } else continue;
                } else asset.colors.push(color + '');

                const image = new ImgMod.Img();
                asset.sublayers.push(image);
                image.name = `${name}.${i + 1}`;
                image.linearOpacity = true;
                image.layerForm = layerForm;
                await image.loadImage(imageBlob);

                if (colorCount > 0) await image.mask(i / colorCount, colorCount);
              }

              await asset.color();

              continue;
            }

            const image = new ImgMod.Img();
            asset.sublayers.push(image);
            image.name = name;
            image.layerForm = layerForm;
            await image.loadImage(imageBlob);
          }
        } catch (error) {
          asset.name = name + ' (ERRORED)';
          console.error(error);
        }

        await asset.render();
        return asset;
      })
    );

    this.setState({ assets: layers });
  };

  render() {
    let elem: ReactNode = <div />;
    if (this.state.assets.length) {
      elem = this.state.assets.map((asset, i) => (
        <div className="container" key={asset.name}>
          <span>
            <img src={asset.src} alt={asset.name} title={asset.name} />
            <div>
              <p>{asset.name}</p>
              <button onClick={this.addLayer.bind(this, i)}>+</button>
            </div>
          </span>
        </div>
      ));
    }

    return (
      <div className="layer-adder">
        <div className="layer-adder-content">{elem}</div>
      </div>
    );
  }
}

export default LayerAdder;
