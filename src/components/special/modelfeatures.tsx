import React, { Component } from 'react';
import * as ImgMod from '@tools/imgmod';
import asset_map from '@/asset_map.json';
import Dropdown from '@components/basic/dropdown';
import GridSelect, { Crop, Option } from '@components/basic/gridselect';
import FileInput from '@components/basic/fileinput';

type AssetType = 'capes' | 'equipment' | 'leggings' | 'items';

const ASSET_TYPE_RESOLUTIONS: Record<AssetType, [width: number, height: number]> = {
  capes: [64, 32],
  equipment: [64, 32],
  leggings: [64, 32],
  items: [16, 16]
};

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

const FEATURE_LIST_ASSET_TYPES: Record<FeatureList, AssetType> = {
  availableCapes: 'capes',
  availableElytras: 'capes',
  availableHelmets: 'equipment',
  availableChestplates: 'equipment',
  availableLeggings: 'leggings',
  availableBoots: 'equipment',
  availableItems: 'items'
};

type CustomFeature = [list: FeatureList, extra?: string];

type FeaturesRecord = Record<FeatureList, Option[]>;

type AProps = {
  features: Features;
  updateFeatures: (features: Features) => void;
};

type AState = FeaturesRecord & {
  customFeatures: Partial<FeaturesRecord>;
};

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
      availableItems: this.getFeatureAssets('items'),
      customFeatures: this.loadCustomFeatures()
    };
  }

  componentDidUpdate(_prevProps: Readonly<AProps>, prevState: Readonly<AState>) {
    if (this.state.customFeatures !== prevState.customFeatures) this.saveCustomFeatures();
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

  loadCustomFeatures = () =>
    JSON.parse(localStorage.getItem('customModelFeatures') ?? '{}') as Partial<FeaturesRecord>;

  saveCustomFeatures = () =>
    localStorage.setItem('customModelFeatures', JSON.stringify(this.state.customFeatures));

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
    const options = this.getOptions(featureList);
    if (!feature) return false;
    for (const option of options) {
      if (!option) continue;
      if (option[1] === feature.value) return option;
    }
    return undefined;
  };

  onCustomUpload: (file: File, feature: CustomFeature) => void = async (file, feature) => {
    const name = feature[1] ? feature[1] + '/' + file.name : file.name;
    const image = new ImgMod.Img();
    image.size = ASSET_TYPE_RESOLUTIONS[FEATURE_LIST_ASSET_TYPES[feature[0]]];

    await image.loadUrl(URL.createObjectURL(file));
    const blobSrc = await image.getImageBlobSrc();
    if (!blobSrc) return;

    const save = this.loadCustomFeatures();
    const updated = save[feature[0]] ?? [];
    updated.push([name, blobSrc, true]);
    save[feature[0]] = updated;

    this.setState({ customFeatures: save });
  };

  deleteCustomFeature = (featureList: FeatureList, option: Option) => {
    const customFeatures = this.state.customFeatures[featureList];
    if (!customFeatures) return;
    this.setState({
      customFeatures: {
        [featureList]: customFeatures.filter(feature => feature !== option)
      }
    });
  };

  getOptions = (featureList: FeatureList) =>
    (this.state.customFeatures[featureList] ?? []).concat(this.state[featureList]);

  render() {
    return (
      <div className="model-features container">
        <p>Model Features</p>
        <br />
        <FeatureEntry
          title="Capes"
          uploadCustom={file => this.onCustomUpload(file, ['availableCapes'])}
          options={this.getOptions('availableCapes')}
          default={this.getFeatureOption('cape', 'availableCapes')}
          changeFeature={option =>
            this.changeFeature('cape', { value: option ? option[1] : option })
          }
          deleteCustomFeature={option => this.deleteCustomFeature('availableCapes', option)}
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
          uploadCustom={file => this.onCustomUpload(file, ['availableElytras'])}
          options={this.getOptions('availableElytras')}
          default={this.getFeatureOption('elytra', 'availableElytras')}
          changeFeature={option =>
            this.changeFeature('elytra', { value: option ? option[1] : option })
          }
          deleteCustomFeature={option => this.deleteCustomFeature('availableElytras', option)}
          crop={{
            aspectRatio: 2.0,
            x: 34.05 / 64,
            y: 2.05 / 32,
            sx: 11.9 / 64,
            sy: 19.9 / 32
          }}
          targetGridEntryWidth={80}
        />
        <FeatureEntry
          title="Helmets"
          uploadCustom={file => this.onCustomUpload(file, ['availableHelmets'])}
          options={this.getOptions('availableHelmets')}
          default={this.getFeatureOption('helmet', 'availableHelmets')}
          changeFeature={option =>
            this.changeFeature('helmet', { value: option ? option[1] : option })
          }
          deleteCustomFeature={option => this.deleteCustomFeature('availableHelmets', option)}
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
          uploadCustom={file => this.onCustomUpload(file, ['availableChestplates'])}
          options={this.getOptions('availableChestplates')}
          default={this.getFeatureOption('chestplate', 'availableChestplates')}
          changeFeature={option =>
            this.changeFeature('chestplate', { value: option ? option[1] : option })
          }
          deleteCustomFeature={option => this.deleteCustomFeature('availableChestplates', option)}
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
          uploadCustom={file => this.onCustomUpload(file, ['availableLeggings'])}
          options={this.getOptions('availableLeggings')}
          default={this.getFeatureOption('leggings', 'availableLeggings')}
          changeFeature={option =>
            this.changeFeature('leggings', { value: option ? option[1] : option })
          }
          deleteCustomFeature={option => this.deleteCustomFeature('availableLeggings', option)}
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
          uploadCustom={file => this.onCustomUpload(file, ['availableBoots'])}
          options={this.getOptions('availableBoots')}
          default={this.getFeatureOption('boots', 'availableBoots')}
          changeFeature={option =>
            this.changeFeature('boots', { value: option ? option[1] : option })
          }
          deleteCustomFeature={option => this.deleteCustomFeature('availableBoots', option)}
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
            options={this.getOptions('availableItems')}
            default={this.getFeatureOption('rightItem', 'availableItems')}
            changeFeature={option =>
              this.changeFeature('rightItem', {
                value: option ? option[1] : option,
                extra: option ? option[0] : undefined
              })
            }
            deleteCustomFeature={option => this.deleteCustomFeature('availableItems', option)}
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
              callback={file => this.onCustomUpload(file, ['availableItems'])}
            >
              Upload custom... (Regular)
            </FileInput>

            <FileInput
              accept="image/png"
              callback={file => this.onCustomUpload(file, ['availableItems', 'handheld'])}
            >
              Upload custom... (Tool)
            </FileInput>
          </FeatureEntry>
          <FeatureEntry
            title="Left Hand"
            options={this.getOptions('availableItems')}
            default={this.getFeatureOption('leftItem', 'availableItems')}
            changeFeature={option =>
              this.changeFeature('leftItem', {
                value: option ? option[1] : option,
                extra: option ? option[0] : undefined
              })
            }
            deleteCustomFeature={option => this.deleteCustomFeature('availableItems', option)}
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
              callback={file => this.onCustomUpload(file, ['availableItems'])}
            >
              Upload custom... (Regular)
            </FileInput>

            <FileInput
              accept="image/png"
              callback={file => this.onCustomUpload(file, ['availableItems', 'handheld'])}
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
  deleteCustomFeature: (option: Option) => void;
  crop?: Crop;
  children?: React.ReactNode;
};

const FeatureEntry = (props: BProps) => (
  <Dropdown title={props.title}>
    <span>
      {props.children ?? (
        <FileInput accept="image/png" callback={file => props.uploadCustom?.(file)}>
          Upload custom...
        </FileInput>
      )}
      <GridSelect
        targetWidth={props.targetGridEntryWidth}
        crop={props.crop}
        options={[false, ...props.options]}
        default={props.default}
        select={props.changeFeature}
        delete={props.deleteCustomFeature}
      />
    </span>
  </Dropdown>
);
