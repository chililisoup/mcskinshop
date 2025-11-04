import React, { ChangeEvent, Component } from 'react';
import * as ImgMod from '@tools/imgmod';
import ColorPicker from '@components/basic/colorpicker';

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
export default class AssetCreator extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    const layers = new ImgMod.Layer([], []);
    layers.advanced = [];

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
    layers.addLayer(new ImgMod.Img(), '#000000');
    this.setState({ layers: layers });
  };

  removeLayer = (index: number) => {
    const layers = this.state.layers;
    layers.removeLayer(index);
    this.setState({ layers: layers });
  };

  moveLayer = (index: number, change: number) => {
    const layers = this.state.layers;
    layers.moveLayer(index, change);
    this.setState({ layers: layers });
  };

  updateAsset = (index: number, asset: ImgMod.AbstractLayer) => {
    const layers = this.state.layers;
    layers.replaceLayer(index, asset);
    this.setState({ layers: layers });
  };

  setColor = (index: number, color: string) => {
    const layers = this.state.layers;
    layers.setColor(index, color);
    this.setState({ layers: layers });
  };

  setAdvanced = (index: number, advanced: boolean) => {
    const layers = this.state.layers;
    if (!(layers.advanced instanceof Array)) return;

    layers.advanced[index] = advanced;

    this.setState({ layers: layers });
  };

  render() {
    let elem: React.ReactNode = <div />;
    if (this.state.layers.getLayers().length) {
      elem = this.state.layers
        .getLayers()
        .map(
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

    await asset.loadUrl(URL.createObjectURL(e.target.files[0]));

    e.target.value = '';
    this.updateAsset(asset);
  };

  changeType = (type: string) => {
    const asset = this.state.asset;
    asset.type(type as ImgMod.LayerType);
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
            {this.state.asset.type() === 'normal' && (
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
            <img alt={''} src={this.state.asset.src}></img>
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
