import React, { Component, ReactNode } from 'react';
import * as ImgMod from '@tools/imgmod';
import asset_map from '@/asset_map.json';
import Dropdown from '@components/basic/dropdown';
import GridSelect, { Crop, Option } from '@components/basic/gridselect';
import FileInput from '@components/basic/fileinput';

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

type CustomFeature = [
  list: FeatureList,
  resolution: [width: number, height: number],
  extra?: string
];

type AProps = {
  features: Features;
  updateFeatures: (features: Features) => void;
};

type AState = Record<FeatureList, Option[]>;

export default class ModelFeatures extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    this.state = {
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
      cape: this.props.features.cape,
      elytra: this.props.features.elytra,
      helmet: this.props.features.helmet,
      chestplate: this.props.features.chestplate,
      leggings: this.props.features.leggings,
      boots: this.props.features.boots,
      rightItem: this.props.features.rightItem,
      leftItem: this.props.features.leftItem
    };

    if (feature && featureType === 'elytra') features.cape = { value: false };
    if (feature && featureType === 'cape') features.elytra = { value: false };

    if (feature.extra && (featureType === 'rightItem' || featureType === 'leftItem'))
      feature.extra = feature.extra.split('/')[0];

    features[featureType] = feature;
    this.props.updateFeatures(features);
  };

  getFeatureOption = (featureType: FeatureType, featureList: FeatureList): Option | undefined => {
    const feature = this.props.features[featureType];
    const options = this.state[featureList];
    if (!feature) return false;
    for (const option of options) {
      if (!option) continue;
      if (option[1] === feature.value) return option;
    }
    return undefined;
  };

  onCustomUpload: (file: File, feature: CustomFeature) => void = async (file, feature) => {
    const image = new ImgMod.Img();
    image.size = feature[1];
    image.name = file.name;
    if (feature[2]) image.name = feature[2] + '/' + image.name;

    await image.loadUrl(URL.createObjectURL(file));

    const updatedFeatures = this.state[feature[0]];
    updatedFeatures.push([image.name, image.src]);

    this.setState({
      [feature[0]]: updatedFeatures
    } as Pick<AState, FeatureList>);
  };

  render() {
    return (
      <div className="model-features container">
        <p>Model Features</p>
        <br />
        <FeatureEntry
          title="Capes"
          uploadCustom={file => this.onCustomUpload(file, ['availableCapes', [64, 32]])}
          options={this.state.availableCapes}
          default={this.getFeatureOption('cape', 'availableCapes')}
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
          uploadCustom={file => this.onCustomUpload(file, ['availableElytras', [64, 32]])}
          options={this.state.availableElytras}
          default={this.getFeatureOption('elytra', 'availableElytras')}
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
          uploadCustom={file => this.onCustomUpload(file, ['availableHelmets', [64, 32]])}
          options={this.state.availableHelmets}
          default={this.getFeatureOption('helmet', 'availableHelmets')}
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
          uploadCustom={file => this.onCustomUpload(file, ['availableChestplates', [64, 32]])}
          options={this.state.availableChestplates}
          default={this.getFeatureOption('chestplate', 'availableChestplates')}
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
          uploadCustom={file => this.onCustomUpload(file, ['availableLeggings', [64, 32]])}
          options={this.state.availableLeggings}
          default={this.getFeatureOption('leggings', 'availableLeggings')}
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
          uploadCustom={file => this.onCustomUpload(file, ['availableBoots', [64, 32]])}
          options={this.state.availableBoots}
          default={this.getFeatureOption('boots', 'availableBoots')}
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
            default={this.getFeatureOption('rightItem', 'availableItems')}
            changeFeature={option =>
              this.changeFeature('rightItem', {
                value: option ? option[1] : option,
                extra: option ? option[0] : undefined
              })
            }
            crop={{
              aspectRatio: 1.0,
              x: -0.05,
              y: -0.05,
              sx: 1.1,
              sy: 1.1
            }}
          >
            <FileInput
              accept="image/png"
              callback={file => this.onCustomUpload(file, ['availableItems', [16, 16]])}
            >
              Upload custom... (Regular)
            </FileInput>

            <FileInput
              accept="image/png"
              callback={file => this.onCustomUpload(file, ['availableItems', [16, 16], 'handheld'])}
            >
              Upload custom... (Tool)
            </FileInput>
          </FeatureEntry>
          <FeatureEntry
            title="Left Hand"
            options={this.state.availableItems}
            default={this.getFeatureOption('leftItem', 'availableItems')}
            changeFeature={option =>
              this.changeFeature('leftItem', {
                value: option ? option[1] : option,
                extra: option ? option[0] : undefined
              })
            }
            crop={{
              aspectRatio: 1.0,
              x: -0.05,
              y: -0.05,
              sx: 1.1,
              sy: 1.1
            }}
          >
            <FileInput
              accept="image/png"
              callback={file => this.onCustomUpload(file, ['availableItems', [16, 16]])}
            >
              Upload custom... (Regular)
            </FileInput>

            <FileInput
              accept="image/png"
              callback={file => this.onCustomUpload(file, ['availableItems', [16, 16], 'handheld'])}
            >
              Upload custom... (Tool)
            </FileInput>
          </FeatureEntry>
        </Dropdown>
      </div>
    );
  }
}

type BProps = {
  title: string;
  uploadCustom?: (file: File) => void;
  targetGridEntryWidth?: number;
  options: readonly Option[];
  default?: Option;
  changeFeature: (option: Option) => void;
  crop?: Crop;
  children?: ReactNode;
};

class FeatureEntry extends Component<BProps> {
  render() {
    const children = this.props.children ?? (
      <FileInput accept="image/png" callback={file => this.props.uploadCustom?.(file)}>
        Upload custom...
      </FileInput>
    );
    return (
      <Dropdown title={this.props.title}>
        <span>
          {children}
          <GridSelect
            targetWidth={this.props.targetGridEntryWidth}
            crop={this.props.crop}
            options={[false, ...this.props.options]}
            default={this.props.default}
            select={this.props.changeFeature}
          />
        </span>
      </Dropdown>
    );
  }
}
