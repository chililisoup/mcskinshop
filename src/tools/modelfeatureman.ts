import { useEffect, useState } from 'react';
import asset_map from '@/asset_map.json';
import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import Speaker from '@tools/speaker';

type AssetType = 'capes' | 'equipment' | 'leggings' | 'items';

const FEATURE_TYPES = [
  'cape',
  'elytra',
  'helmet',
  'chestplate',
  'leggings',
  'boots',
  'rightItem',
  'leftItem'
] as const;

export type FeatureType = (typeof FEATURE_TYPES)[number];

const FEATURE_LISTS = [
  'capes',
  'elytras',
  'helmets',
  'chestplates',
  'leggings',
  'boots',
  'items'
] as const;

export type FeatureList = (typeof FEATURE_LISTS)[number];

export const FEATURE_TYPE_LISTS: Record<FeatureType, FeatureList> = {
  cape: 'capes',
  elytra: 'elytras',
  helmet: 'helmets',
  chestplate: 'chestplates',
  leggings: 'leggings',
  boots: 'boots',
  rightItem: 'items',
  leftItem: 'items'
};

export type FeatureKey = {
  key?: string;
  custom?: boolean;
};

export type Feature = {
  src: string;
  extra?: string;
};

export type FeatureSet = Record<string, Feature>;

export type FeaturesRecord = Record<FeatureList, FeatureSet>;

export default abstract class ModelFeatureManager {
  private static usedFeatures: Record<FeatureType, FeatureKey> = {
    cape: {},
    elytra: {},
    helmet: {},
    chestplate: {},
    leggings: {},
    boots: {},
    rightItem: {},
    leftItem: {}
  };
  private static featureSets: FeaturesRecord = {
    capes: this.getFeatureSet('capes', ['0_elytra']),
    elytras: this.getFeatureSet('capes'),
    helmets: this.getFeatureSet('equipment'), // Helmets, chestplates, and boots share a texture file
    chestplates: this.getFeatureSet('equipment', ['turtle_scute']),
    leggings: this.getFeatureSet('leggings'),
    boots: this.getFeatureSet('equipment', ['turtle_scute']),
    items: this.getFeatureSet('items')
  };
  private static customFeatureSets: Partial<FeaturesRecord> = this.loadCustomFeatures();

  static speaker = new Speaker(() => this.getUsedFeatures());
  static featureSetSpeaker = new Speaker(() => this.getFeatureSets());

  static getUsedFeatures = () => structuredClone(this.usedFeatures);

  static setUsedFeatures = (features: Partial<Record<FeatureType, FeatureKey>>) => {
    for (const [featureType, featureKey] of Object.entries(features))
      if (this.getFeature(featureType as FeatureType, featureKey))
        this.usedFeatures[featureType as FeatureType] = featureKey;

    this.speaker.updateListeners();
  };

  static resetUsedFeatures = () => {
    FEATURE_TYPES.forEach(featureType => (this.usedFeatures[featureType] = {}));
    this.speaker.updateListeners();
  };

  static getTrimmedUsedFeatures = () => {
    const trimmed: Partial<Record<FeatureType, FeatureKey>> = {};

    for (const [featureType, featureKey] of Object.entries(this.getUsedFeatures()))
      if (!Util.isEmpty(featureKey)) trimmed[featureType as FeatureType] = featureKey;

    return trimmed;
  };

  static getFeature = (featureType: FeatureType, featureKey: FeatureKey) =>
    featureKey.key
      ? this.getFeatureInternal(featureType, featureKey.key, featureKey.custom ?? false)
      : undefined;

  static getUsedFeature = (featureType: FeatureType) =>
    this.getFeature(featureType, this.usedFeatures[featureType]);

  private static getFeatureInternal = (featureType: FeatureType, key: string, custom: boolean) =>
    (custom ? this.customFeatureSets : this.featureSets)[FEATURE_TYPE_LISTS[featureType]]?.[key];

  static getFeatureSets = () =>
    Object.fromEntries(
      FEATURE_LISTS.map(list => [
        list,
        {
          base: { ...this.featureSets[list] } as const,
          custom: { ...this.customFeatureSets[list] } as const
        }
      ])
    ) as Record<FeatureList, { base: Readonly<FeatureSet>; custom: Readonly<FeatureSet> }>;

  static selectFeature = (featureType: FeatureType, key: string | false, custom?: boolean) => {
    if (key) {
      const feature = this.getFeatureInternal(featureType, key, custom ?? false);

      this.usedFeatures[featureType] = feature
        ? {
            key: key,
            custom: custom
          }
        : {};

      if (feature && featureType === 'elytra') this.usedFeatures.cape = {};
      if (feature && featureType === 'cape') this.usedFeatures.elytra = {};
    } else this.usedFeatures[featureType] = {};

    this.speaker.updateListeners();
  };

  private static getFeatureSet(feature: AssetType, exclusions?: string[]) {
    exclusions = exclusions ?? [];

    const featureSet: FeatureSet = {};

    asset_map[feature].forEach(asset => {
      const key = asset.substring(0, asset.lastIndexOf('.'));
      if (exclusions.includes(key)) return;

      const extra = asset.split('/');
      featureSet[key] = {
        src: `/assets/features/${feature}/${asset}`,
        extra: extra.length > 1 ? extra[0] : undefined
      };
    });

    return featureSet;
  }

  private static saveCustomFeatures = () =>
    localStorage.setItem('customModelFeatures', JSON.stringify(this.customFeatureSets));

  private static loadCustomFeatures(): Partial<FeaturesRecord> {
    const customFeatures: Partial<FeaturesRecord> = {};

    const parsed = JSON.parse(localStorage.getItem('customModelFeatures') ?? '{}') as unknown;

    if (!parsed || typeof parsed !== 'object') return customFeatures;

    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      if (!Util.includes(FEATURE_LISTS, key)) continue;

      const featureSet: FeatureSet = {};

      for (const [name, maybeFeature] of Object.entries(value as Record<string, unknown>)) {
        if (!maybeFeature || typeof maybeFeature !== 'object') continue;
        if (!Util.isKeyOfObject('src', maybeFeature)) continue;

        const feature = maybeFeature as { src: unknown; extra?: unknown };
        if (typeof feature.src !== 'string') continue;

        featureSet[name] = {
          src: feature.src,
          extra: feature.extra && typeof feature.extra === 'string' ? feature.extra : undefined
        };
      }

      if (!Util.isEmpty(featureSet)) customFeatures[key] = featureSet;
    }

    return customFeatures;
  }

  static uploadCustomFeature: (file: File, list: FeatureList, extra?: string) => void = async (
    file,
    list,
    extra
  ) => {
    const name = file.name.substring(0, file.name.lastIndexOf('.'));
    let key = name;
    const image = new ImgMod.Img();

    await image.loadUrl(URL.createObjectURL(file), true);
    const blobSrc = await image.getImageBlobSrc();
    if (!blobSrc) return;

    if (this.customFeatureSets[list])
      for (let i = 1; key in this.customFeatureSets[list]; i++) key = `name_${i}`;
    else this.customFeatureSets[list] = {};

    this.customFeatureSets[list][key] = {
      src: blobSrc,
      extra: extra
    };

    this.saveCustomFeatures();
    this.featureSetSpeaker.updateListeners();
  };

  static deleteCustomFeature = (featureList: FeatureList, key: string) => {
    if (!this.customFeatureSets[featureList]) return;

    delete this.customFeatureSets[featureList][key];
    if (Util.isEmpty(this.customFeatureSets[featureList]))
      delete this.customFeatureSets[featureList];

    this.saveCustomFeatures();
    this.featureSetSpeaker.updateListeners();
  };
}

export function useModelFeatures() {
  const [features, setFeatures] = useState(ModelFeatureManager.getUsedFeatures());

  useEffect(() => {
    ModelFeatureManager.speaker.registerListener(setFeatures);
    return () => ModelFeatureManager.speaker.unregisterListener(setFeatures);
  }, [features]);

  return features;
}

export function useModelFeatureSets() {
  const [featureSets, setFeatureSets] = useState(ModelFeatureManager.getFeatureSets());

  useEffect(() => {
    ModelFeatureManager.featureSetSpeaker.registerListener(setFeatureSets);
    return () => ModelFeatureManager.featureSetSpeaker.unregisterListener(setFeatureSets);
  }, [featureSets]);

  return featureSets;
}
