import React, { ChangeEvent, Component, RefObject } from 'react';
import * as ImgMod from '../../tools/imgmod';
import * as Util from '../../tools/util';
import asset_map from '../../asset_map.json';
import Dropdown from '../basic/dropdown';
import GridSelect, { Crop, Option } from '../basic/gridselect';

type AssetType = 'capes' | 'equipment' | 'leggings';

type FeatureType = 'cape' | 'helmet' | 'chestplate' | 'leggings' | 'boots';

export type Features = Record<FeatureType, string | false>;

type FeatureList =
  | 'availableCapes'
  | 'availableHelmets'
  | 'availableChestplates'
  | 'availableLeggings'
  | 'availableBoots';

type AProps = {
  updateFeatures: (features: Features) => void;
};

type AState = Features & Record<FeatureList, Option[]>;

class ModelFeatures extends Component<AProps, AState> {
  uploadRef: RefObject<HTMLInputElement | null> = React.createRef();
  uploadFeature: [list: FeatureList, resolution: [width: number, height: number]] | false = false;

  constructor(props: AProps) {
    super(props);

    this.state = {
      cape: false,
      helmet: false,
      chestplate: false,
      leggings: false,
      boots: false,
      availableCapes: this.getFeatureAssets('capes'),
      availableHelmets: this.getFeatureAssets('equipment'), // Helmets, chestplates, and boots share a texture file
      availableChestplates: this.getFeatureAssets('equipment', ['turtle_scute']),
      availableLeggings: this.getFeatureAssets('leggings'),
      availableBoots: this.getFeatureAssets('equipment', ['turtle_scute'])
    };
  }

  getFeatureAssets = (feature: AssetType, exclusions?: string[]) => {
    exclusions = exclusions ?? [];
    return asset_map[feature]
      .map(
        asset =>
          [
            asset.substring(0, asset.lastIndexOf('.')),
            `/assets/features/${feature}/${asset}`
          ] as Option
      )
      .filter(asset => !exclusions.includes(asset[0]));
  };

  changeFeature = (feature: FeatureType, value: string | false) => {
    const features: Features = {
      cape: this.state.cape,
      helmet: this.state.helmet,
      chestplate: this.state.chestplate,
      leggings: this.state.leggings,
      boots: this.state.boots
    };
    features[feature] = value;
    this.setState(features);
    this.props.updateFeatures(features);
  };

  onCustomUpload: (e: ChangeEvent<HTMLInputElement>) => void = async e => {
    if (!e.target.files) return;
    if (!this.uploadFeature) return;

    const image = new ImgMod.Img();
    image.size = this.uploadFeature[1];
    image.name = e.target.files[0].name;
    image.id = Util.randomKey();

    await image.render(URL.createObjectURL(e.target.files[0]));

    e.target.value = '';

    const updatedFeatures = this.state[this.uploadFeature[0]];
    updatedFeatures.push([image.name, image.src]);

    this.setState({
      [this.uploadFeature[0]]: updatedFeatures
    } as Pick<AState, FeatureList>);

    this.uploadFeature = false;
  };

  uploadCustom = (feature: [list: FeatureList, resolution: [width: number, height: number]]) => {
    if (this.uploadFeature) return;
    if (!this.uploadRef.current) return;

    this.uploadFeature = feature;
    this.uploadRef.current.click();
  };

  render() {
    return (
      <div className="model-features container">
        <input
          className="hidden"
          ref={this.uploadRef}
          type="file"
          accept="image/png"
          onChange={this.onCustomUpload}
        />
        <p>Model Features</p>
        <br />
        <FeatureEntry
          title="Capes"
          uploadCustom={() => this.uploadCustom(['availableCapes', [64, 32]])}
          options={this.state.availableCapes}
          changeFeature={option => this.changeFeature('cape', option)}
          crop={{
            aspectRatio: 2.0,
            x: 1.05 / 64,
            y: 1.05 / 32,
            sx: 20.9 / 64,
            sy: 15.9 / 32
          }}
        />
        <FeatureEntry
          title="Helmets"
          uploadCustom={() => this.uploadCustom(['availableHelmets', [64, 32]])}
          options={this.state.availableHelmets}
          changeFeature={option => this.changeFeature('helmet', option)}
          crop={{
            aspectRatio: 2.0,
            x: 0.05 / 64,
            y: 0.05 / 32,
            sx: 15.9 / 64,
            sy: 15.9 / 32
          }}
        />
        <FeatureEntry
          title="Chestplates"
          uploadCustom={() => this.uploadCustom(['availableChestplates', [64, 32]])}
          options={this.state.availableChestplates}
          changeFeature={option => this.changeFeature('chestplate', option)}
          crop={{
            aspectRatio: 2.0,
            x: 16.05 / 64,
            y: 20.05 / 32,
            sx: 15.9 / 64,
            sy: 11.9 / 32
          }}
        />
        <FeatureEntry
          title="Leggings"
          uploadCustom={() => this.uploadCustom(['availableLeggings', [64, 32]])}
          options={this.state.availableLeggings}
          changeFeature={option => this.changeFeature('leggings', option)}
          crop={{
            aspectRatio: 2.0,
            x: 20.05 / 64,
            y: 27.05 / 32,
            sx: 7.9 / 64,
            sy: 4.9 / 32
          }}
        />
        <FeatureEntry
          title="Boots"
          uploadCustom={() => this.uploadCustom(['availableBoots', [64, 32]])}
          options={this.state.availableBoots}
          changeFeature={option => this.changeFeature('boots', option)}
          crop={{
            aspectRatio: 2.0,
            x: 0.05 / 64,
            y: 26.05 / 32,
            sx: 11.9 / 64,
            sy: 5.9 / 32
          }}
        />
      </div>
    );
  }
}

type BProps = {
  title: string;
  uploadCustom: () => void;
  targetGridEntryWidth?: number;
  options: readonly Option[];
  changeFeature: (option: string | false) => void;
  crop?: Crop;
};

class FeatureEntry extends Component<BProps> {
  render() {
    return (
      <Dropdown title={this.props.title}>
        <span>
          <button onClick={this.props.uploadCustom}>Upload custom...</button>
          <GridSelect
            emptyOption
            targetWidth={this.props.targetGridEntryWidth}
            crop={this.props.crop}
            options={this.props.options}
            select={this.props.changeFeature}
          />
        </span>
      </Dropdown>
    );
  }
}

export default ModelFeatures;
