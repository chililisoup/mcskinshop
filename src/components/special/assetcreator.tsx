import React, { ChangeEvent, Component, ReactNode } from 'react';
import * as ImgMod from '../../tools/imgmod';
import * as Util from '../../tools/util';
import ColorPicker from '../basic/colorpicker';

type AProps = {
  addLayer: (layer: ImgMod.AbstractLayer) => void;
};

type AState = {
  name: string;
  model: string;
  part: string;
  layers: ImgMod.Layer;
};

// the asset testing needs to send unique asset ids but in order to do that you need to make deep copies of the assets ahhhhhhh
class AssetCreator extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    const layers = new ImgMod.Layer([], []);
    layers.advanced = [];
    layers.id = Util.randomKey();

    this.state = {
      name: '',
      model: 'steve',
      part: 'head',
      layers: layers
    };
  }

  updateName = (name: string) => {
    name = name.replaceAll(' ', '_').toLowerCase();
    const layers = this.state.layers;
    layers.name = name;
    this.setState({ name: name, layers: layers });
  };

  addLayer = () => {
    const layers = this.state.layers;
    const layer = new ImgMod.Img();
    layer.id = Util.randomKey();
    layers.sublayers.push(layer);
    if (layers.colors instanceof Array) layers.colors.push('#000000');
    if (layers.advanced instanceof Array) layers.advanced.push(false);
    this.setState({ layers: layers });
  };

  removeLayer = (index: number) => {
    const layers = this.state.layers;
    if (!(layers.colors instanceof Array)) return;
    if (!(layers.advanced instanceof Array)) return;

    layers.sublayers.splice(index, 1);
    layers.colors.splice(index, 1);
    layers.advanced.splice(index, 1);
    this.setState({ layers: layers });
  };

  moveLayer = (index: number, change: number) => {
    const layers = this.state.layers;
    if (!(layers.colors instanceof Array)) return;
    if (!(layers.advanced instanceof Array)) return;

    const layer = layers.sublayers[index];
    const color = layers.colors[index];
    const advanced = layers.advanced[index];

    if (index + change < 0) change = layers.sublayers.length - 1;
    if (index + change >= layers.sublayers.length) change = 0 - (layers.sublayers.length - 1);

    layers.sublayers.splice(index, 1);
    layers.sublayers.splice(index + change, 0, layer);

    layers.colors.splice(index, 1);
    layers.colors.splice(index + change, 0, color);

    layers.advanced.splice(index, 1);
    layers.advanced.splice(index + change, 0, advanced);

    this.setState({ layers: layers });
  };

  updateAsset = (index: number, asset: ImgMod.AbstractLayer) => {
    const layers = this.state.layers;
    layers.sublayers[index] = asset;

    this.setState({ layers: layers });
  };

  setColor = (index: number, color: string) => {
    const layers = this.state.layers;
    if (!(layers.colors instanceof Array)) return;

    layers.colors[index] = color;

    this.setState({ layers: layers });
  };

  setAdvanced = (index: number, advanced: boolean) => {
    const layers = this.state.layers;
    if (!(layers.advanced instanceof Array)) return;

    layers.advanced[index] = advanced;

    this.setState({ layers: layers });
  };

  render() {
    let elem: ReactNode = <div />;
    if (this.state.layers.sublayers.length) {
      elem = this.state.layers.sublayers.map(
        (asset, i) =>
          asset instanceof ImgMod.Img && (
            <AssetLayer
              key={asset.id}
              asset={asset}
              index={i}
              removeLayer={this.removeLayer}
              moveLayer={this.moveLayer}
              updateAsset={this.updateAsset}
              setColor={this.setColor}
              setAdvanced={this.setAdvanced}
            />
          )
      );
    }

    return (
      <div className="container">
        <h3>ASSET BEATER 420</h3>
        <span>
          <label>Asset Name:</label>
          <input
            placeholder="my_asset"
            value={this.state.name}
            onChange={e => this.updateName(e.target.value)}
          />
        </span>
        <span>
          <label>Model:</label>
          <select>
            <option>Steve (4px)</option>
            <option>Alex (3px)</option>
            <option>Universal</option>
          </select>
        </span>
        <span>
          <label>Part:</label>
          <select>
            <option>Head</option>
            <option>Body</option>
            <option>Legs</option>
            <option>Full</option>
          </select>
        </span>
        <span>
          <button onClick={() => this.props.addLayer(this.state.layers)}>Test Asset</button>
          <button onClick={this.addLayer}>Add Layer</button>
          <button>Export Asset</button>
        </span>
        <div className="container asset-layer-manager">{elem}</div>
      </div>
    );
  }
}

type BProps = {
  asset: ImgMod.Img;
  index: number;
  removeLayer: (index: number) => void;
  moveLayer: (index: number, change: number) => void;
  updateAsset: (index: number, asset: ImgMod.Img) => void;
  setColor: (index: number, color: string) => void;
  setAdvanced: (index: number, advanced: boolean) => void;
};

type BState = {
  asset: ImgMod.Img;
};

class AssetLayer extends Component<BProps, BState> {
  constructor(props: BProps) {
    super(props);
    this.state = {
      asset: props.asset
    };
  }

  setImage: (e: ChangeEvent<HTMLInputElement>) => void = async e => {
    if (!e.target.files) return;
    const asset = this.state.asset;
    asset.name = e.target.files[0].name.slice(0, -4).replaceAll(' ', '_').toLowerCase();
    asset.id = Util.randomKey();

    await asset.render(URL.createObjectURL(e.target.files[0]));

    e.target.value = '';
    this.updateAsset(asset);
  };

  changeType = (type: string) => {
    const asset = this.state.asset;
    asset.type = type as ImgMod.LayerType;
    this.updateAsset(asset);
    this.props.setColor(this.props.index, type);
    this.props.setAdvanced(this.props.index, type !== 'normal');
  };

  updateAsset = (asset: ImgMod.Img) => {
    this.setState({ asset: asset });
    this.props.updateAsset(this.props.index, asset);
  };

  render() {
    return (
      <div className="container">
        <p>{this.state.asset.name}</p>
        <span>
          <label>Image:</label>
          <input type="file" accept="image/png" onChange={this.setImage} />
        </span>
        <span>
          <div>
            <span>
              <label>Type:</label>
              <select onChange={e => this.changeType(e.target.value)}>
                <option value="normal">Normal</option>
                <option value="erase">Erase</option>
                <option value="flatten">Flatten</option>
                <option value="null">No Color</option>
              </select>
            </span>
            {this.state.asset.type === 'normal' && (
              <div>
                <span>
                  <label>Default Color:</label>
                  <ColorPicker update={color => this.props.setColor(this.props.index, color)} />
                </span>
                <span>
                  <label>Is advanced?</label>
                  <input
                    type="checkbox"
                    onChange={e => this.props.setAdvanced(this.props.index, e.target.checked)}
                  />
                </span>
              </div>
            )}
          </div>
          <div>
            <img alt={''} src={this.state.asset.rawSrc}></img>
            <span>
              <button onClick={() => this.props.moveLayer(this.props.index, 1)}>&#9650;</button>
              <button onClick={() => this.props.moveLayer(this.props.index, -1)}>&#9660;</button>
              <button onClick={() => this.props.removeLayer(this.props.index)}>&#10006;</button>
            </span>
          </div>
        </span>
      </div>
    );
  }
}

export default AssetCreator;
