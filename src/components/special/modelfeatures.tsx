import React, { ChangeEvent, Component, RefObject } from 'react';
import * as ImgMod from '../../tools/imgmod';
import asset_map from '../../asset_map.json';
import Dropdown from '../basic/dropdown';
import GridSelect, { Crop, Option } from '../basic/gridselect';

type AssetType = 'capes' | 'equipment' | 'leggings' | 'items';

type FeatureType =
  | 'cape'
  | 'elytra'
  | 'helmet'
  | 'chestplate'
  | 'leggings'
  | 'boots'
  | 'rightItem'
  | 'leftItem';

export type Feature = {
  value: string | false;
  extra?: string;
};

export type Features = Record<FeatureType, Feature>;

type FeatureList =
  | 'availableCapes'
  | 'availableElytras'
  | 'availableHelmets'
  | 'availableChestplates'
  | 'availableLeggings'
  | 'availableBoots'
  | 'availableItems';

type AProps = {
  updateFeatures: (features: Features) => void;
};

type AState = Features & Record<FeatureList, Option[]>;

class ModelFeatures extends Component<AProps, AState> {
  uploadRef: RefObject<HTMLInputElement | null> = React.createRef();
  uploadFeature:
    | [list: FeatureList, resolution: [width: number, height: number], extra?: string]
    | false = false;

  constructor(props: AProps) {
    super(props);

    this.state = {
      cape: { value: false },
      elytra: { value: false },
      helmet: { value: false },
      chestplate: { value: false },
      leggings: { value: false },
      boots: { value: false },
      rightItem: { value: false },
      leftItem: { value: false },
      availableCapes: this.getFeatureAssets('capes', ['0_elytra']),
      availableElytras: this.getFeatureAssets('capes'),
      availableHelmets: this.getFeatureAssets('equipment'), // Helmets, chestplates, and boots share a texture file
      availableChestplates: this.getFeatureAssets('equipment', ['turtle_scute']),
      availableLeggings: this.getFeatureAssets('leggings'),
      availableBoots: this.getFeatureAssets('equipment', ['turtle_scute']),
      availableItems: this.getFeatureAssets('items')
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
      .filter(asset => !exclusions.includes(asset ? asset[0] : ''));
  };

  changeFeature = (featureType: FeatureType, feature: Feature) => {
    const features: Features = {
      cape: this.state.cape,
      elytra: this.state.elytra,
      helmet: this.state.helmet,
      chestplate: this.state.chestplate,
      leggings: this.state.leggings,
      boots: this.state.boots,
      rightItem: this.state.rightItem,
      leftItem: this.state.leftItem
    };

    if (feature && featureType === 'elytra') features.cape = { value: false };
    if (feature && featureType === 'cape') features.elytra = { value: false };

    if (feature.extra && (featureType === 'rightItem' || featureType === 'leftItem'))
      feature.extra = feature.extra.split('/')[0];

    features[featureType] = feature;

    this.setState(features);
    this.props.updateFeatures(features);
  };

  onCustomUpload: (e: ChangeEvent<HTMLInputElement>) => void = async e => {
    if (!e.target.files) return;
    if (!this.uploadFeature) return;

    const image = new ImgMod.Img();
    image.size = this.uploadFeature[1];
    image.name = e.target.files[0].name;
    if (this.uploadFeature[2]) image.name = this.uploadFeature[2] + '/' + image.name;

    await image.loadUrl(URL.createObjectURL(e.target.files[0]));

    e.target.value = '';

    const updatedFeatures = this.state[this.uploadFeature[0]];
    updatedFeatures.push([image.name, image.src]);

    this.setState({
      [this.uploadFeature[0]]: updatedFeatures
    } as Pick<AState, FeatureList>);

    this.uploadFeature = false;
  };

  uploadCustom = (
    feature: [list: FeatureList, resolution: [width: number, height: number], extra?: string]
  ) => {
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
          changeFeature={option =>
            this.changeFeature('cape', { value: option ? option[1] : option })
          }
          crop={{
            aspectRatio: 2.0,
            x: 1.05 / 64,
            y: 1.05 / 32,
            sx: 20.9 / 64,
            sy: 15.9 / 32
          }}
        />
        <FeatureEntry
          title="Elytras"
          uploadCustom={() => this.uploadCustom(['availableElytras', [64, 32]])}
          options={this.state.availableElytras}
          changeFeature={option =>
            this.changeFeature('elytra', { value: option ? option[1] : option })
          }
          crop={{
            aspectRatio: 2.0,
            x: 30.05 / 64,
            y: 2.05 / 32,
            sx: 19.9 / 64,
            sy: 19.9 / 32
          }}
        />
        <FeatureEntry
          title="Helmets"
          uploadCustom={() => this.uploadCustom(['availableHelmets', [64, 32]])}
          options={this.state.availableHelmets}
          changeFeature={option =>
            this.changeFeature('helmet', { value: option ? option[1] : option })
          }
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
          changeFeature={option =>
            this.changeFeature('chestplate', { value: option ? option[1] : option })
          }
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
          changeFeature={option =>
            this.changeFeature('leggings', { value: option ? option[1] : option })
          }
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
          changeFeature={option =>
            this.changeFeature('boots', { value: option ? option[1] : option })
          }
          crop={{
            aspectRatio: 2.0,
            x: 0.05 / 64,
            y: 26.05 / 32,
            sx: 11.9 / 64,
            sy: 5.9 / 32
          }}
        />
        <Dropdown title="Items">
          <FeatureEntry
            title="Right Hand"
            options={this.state.availableItems}
            changeFeature={option =>
              this.changeFeature('rightItem', {
                value: option ? option[1] : option,
                extra: option ? option[0] : undefined
              })
            }
            buttons={[
              {
                onClick: () => this.uploadCustom(['availableItems', [16, 16]]),
                text: 'Upload custom... (Regular)'
              },
              {
                onClick: () => this.uploadCustom(['availableItems', [16, 16], 'handheld']),
                text: 'Upload custom... (Tool)'
              }
            ]}
            crop={{
              aspectRatio: 1.0,
              x: -0.05,
              y: -0.05,
              sx: 1.1,
              sy: 1.1
            }}
          />
          <FeatureEntry
            title="Left Hand"
            options={this.state.availableItems}
            changeFeature={option =>
              this.changeFeature('leftItem', {
                value: option ? option[1] : option,
                extra: option ? option[0] : undefined
              })
            }
            buttons={[
              {
                onClick: () => this.uploadCustom(['availableItems', [16, 16]]),
                text: 'Upload custom... (Regular)'
              },
              {
                onClick: () => this.uploadCustom(['availableItems', [16, 16], 'handheld']),
                text: 'Upload custom... (Tool)'
              }
            ]}
            crop={{
              aspectRatio: 1.0,
              x: -0.05,
              y: -0.05,
              sx: 1.1,
              sy: 1.1
            }}
          />
        </Dropdown>
      </div>
    );
  }
}

type BProps = {
  title: string;
  uploadCustom?: () => void;
  targetGridEntryWidth?: number;
  options: readonly Option[];
  changeFeature: (option: Option) => void;
  crop?: Crop;
  buttons?: {
    onClick: () => void;
    text: string;
  }[];
};

class FeatureEntry extends Component<BProps> {
  render() {
    const buttons = this.props.buttons ?? [
      {
        onClick: this.props.uploadCustom,
        text: 'Upload custom...'
      }
    ];

    const buttonElements = buttons.map(button => (
      <button onClick={button.onClick}>{button.text}</button>
    ));

    return (
      <Dropdown title={this.props.title}>
        <span>
          {...buttonElements}
          <GridSelect
            targetWidth={this.props.targetGridEntryWidth}
            crop={this.props.crop}
            options={[false, ...this.props.options]}
            select={this.props.changeFeature}
          />
        </span>
      </Dropdown>
    );
  }
}

export default ModelFeatures;
