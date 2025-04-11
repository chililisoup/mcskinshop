import React, { Component, ReactNode } from 'react';
import * as ImgMod from '../../tools/imgmod';
import fakedatabase from '../../fakedatabase.json';

type AProps = {
  addLayer: (layer: ImgMod.AbstractLayer) => void;
};

type AState = {
  layers: ImgMod.Layer;
};

class LayerAdder extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    this.state = {
      layers: new ImgMod.Layer()
    };
  }

  componentDidMount() {
    this.loadAssets();
  }

  addLayer: (id: number) => void = async (id: number) => {
    const layer = new ImgMod.Layer();
    layer.name = fakedatabase[id].name;
    // Using spread operators since imported json objects
    // are mutable global constants for some reason
    layer.colors = [...fakedatabase[id].colors];
    layer.advanced = [...fakedatabase[id].advanced];
    layer.id = Math.random().toString(16).slice(2);

    await Promise.all(
      fakedatabase[id].layers.map((src, i) => {
        const image = new ImgMod.Img();
        layer.sublayers.push(image);

        const layerType = ImgMod.checkLayerType(fakedatabase[id].colors[i]);
        if (layerType) image.type = layerType;

        return image.render(import.meta.env.ASSET_PREFIX + fakedatabase[id].loc + src);
      })
    );

    console.log(fakedatabase[id]);
    console.log(layer);

    this.props.addLayer(layer);
  };

  loadAssets: () => void = async () => {
    const layers = new ImgMod.Layer();

    await Promise.all(
      fakedatabase.map(async asset => {
        const sublayer = new ImgMod.Layer();
        layers.sublayers.push(sublayer);

        await Promise.all(
          asset.layers.map(src => {
            const image = new ImgMod.Img();
            sublayer.sublayers.push(image);
            return image.render(import.meta.env.ASSET_PREFIX + asset.loc + src);
          })
        );
        return sublayer.render();
      })
    );

    this.setState({ layers: layers });
  };

  render() {
    let elem: ReactNode = <div />;
    if (this.state.layers.sublayers.length) {
      elem = this.state.layers.sublayers.map((sublayer, i) => {
        return (
          <div className="container" key={fakedatabase[i].name}>
            <span>
              <img src={sublayer.src} alt={fakedatabase[i].name} title={fakedatabase[i].name} />
              <div>
                <p>{fakedatabase[i].name}</p>
                <button onClick={this.addLayer.bind(this, i)}>+</button>
              </div>
            </span>
          </div>
        );
      });
    }

    return (
      <div className="layer-adder">
        <div className="layer-adder-content">{elem}</div>
      </div>
    );
  }
}

export default LayerAdder;
