import React from 'react';
import Dropdown from '@components/basic/dropdown';
import GridSelect, { Crop, Option } from '@components/basic/gridselect';
import FileInput from '@components/basic/fileinput';
import ModelFeatureManager, {
  FeatureList,
  FeatureType,
  useModelFeatures,
  useModelFeatureSets
} from '@tools/modelfeatureman';

export default function ModelFeatures() {
  const featureSets = useModelFeatureSets();
  const features = useModelFeatures();

  const deleteCustomFeature = (featureList: FeatureList, id: string) =>
    ModelFeatureManager.deleteCustomFeature(featureList, id.substring(id.indexOf('_') + 1));

  const getDefault = (featureType: FeatureType) =>
    features[featureType].key
      ? (features[featureType].custom ? 'custom_' : 'base_') + features[featureType].key
      : undefined;

  function getOptions(featureList: FeatureList) {
    const baseOptions: [key: string, value: Option][] = Object.entries(
      featureSets[featureList].base
    ).map(([key, feature]) => [
      `base_${key}`,
      {
        imageSrc: feature.src
      }
    ]);

    const customOptions: [key: string, value: Option][] = Object.entries(
      featureSets[featureList].custom
    ).map(([key, feature]) => [
      `custom_${key}`,
      {
        imageSrc: feature.src,
        hasDeleteButton: true
      }
    ]);

    return Object.fromEntries(customOptions.concat(baseOptions));
  }

  function selectFeature(featureType: FeatureType, id: string | false) {
    if (id) {
      const custom = id.split('_')[0] === 'custom';
      const key = id.substring(id.indexOf('_') + 1);

      ModelFeatureManager.selectFeature(featureType, key, custom);
    } else ModelFeatureManager.selectFeature(featureType, id);
  }

  return (
    <div className="model-features container">
      <p>Model Features</p>
      <br />
      <FeatureEntry
        title="Capes"
        uploadCustom={file => ModelFeatureManager.uploadCustomFeature(file, 'capes')}
        options={getOptions('capes')}
        default={getDefault('cape')}
        select={id => selectFeature('cape', id)}
        deleteCustomFeature={option => deleteCustomFeature('capes', option)}
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
        uploadCustom={file => ModelFeatureManager.uploadCustomFeature(file, 'elytras')}
        options={getOptions('elytras')}
        default={getDefault('elytra')}
        select={id => selectFeature('elytra', id)}
        deleteCustomFeature={option => deleteCustomFeature('elytras', option)}
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
        uploadCustom={file => ModelFeatureManager.uploadCustomFeature(file, 'helmets')}
        options={getOptions('helmets')}
        default={getDefault('helmet')}
        select={id => selectFeature('helmet', id)}
        deleteCustomFeature={option => deleteCustomFeature('helmets', option)}
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
        uploadCustom={file => ModelFeatureManager.uploadCustomFeature(file, 'chestplates')}
        options={getOptions('chestplates')}
        default={getDefault('chestplate')}
        select={id => selectFeature('chestplate', id)}
        deleteCustomFeature={option => deleteCustomFeature('chestplates', option)}
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
        uploadCustom={file => ModelFeatureManager.uploadCustomFeature(file, 'leggings')}
        options={getOptions('leggings')}
        default={getDefault('leggings')}
        select={id => selectFeature('leggings', id)}
        deleteCustomFeature={option => deleteCustomFeature('leggings', option)}
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
        uploadCustom={file => ModelFeatureManager.uploadCustomFeature(file, 'boots')}
        options={getOptions('boots')}
        default={getDefault('boots')}
        select={id => selectFeature('boots', id)}
        deleteCustomFeature={option => deleteCustomFeature('boots', option)}
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
          options={getOptions('items')}
          default={getDefault('rightItem')}
          select={id => selectFeature('rightItem', id)}
          deleteCustomFeature={option => deleteCustomFeature('items', option)}
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
            callback={file => ModelFeatureManager.uploadCustomFeature(file, 'items')}
          >
            Upload custom... (Regular)
          </FileInput>

          <FileInput
            accept="image/png"
            callback={file => ModelFeatureManager.uploadCustomFeature(file, 'items', 'handheld')}
          >
            Upload custom... (Tool)
          </FileInput>
        </FeatureEntry>
        <FeatureEntry
          title="Left Hand"
          options={getOptions('items')}
          default={getDefault('leftItem')}
          select={id => selectFeature('leftItem', id)}
          deleteCustomFeature={option => deleteCustomFeature('items', option)}
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
            callback={file => ModelFeatureManager.uploadCustomFeature(file, 'items')}
          >
            Upload custom... (Regular)
          </FileInput>

          <FileInput
            accept="image/png"
            callback={file => ModelFeatureManager.uploadCustomFeature(file, 'items', 'handheld')}
          >
            Upload custom... (Tool)
          </FileInput>
        </FeatureEntry>
      </Dropdown>
    </div>
  );
}

type BProps = {
  title: string;
  uploadCustom?: (file: File) => void;
  targetGridEntryWidth?: number;
  options: Readonly<Record<string, Option>>;
  default?: string;
  select: (id: string | false) => void;
  deleteCustomFeature: (id: string) => void;
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
        options={{ false: false, ...props.options }}
        default={props.default}
        select={props.select}
        delete={props.deleteCustomFeature}
      />
    </span>
  </Dropdown>
);
