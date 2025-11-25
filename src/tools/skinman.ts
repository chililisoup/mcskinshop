import { useCallback, useEffect, useState } from 'react';
import * as ImgMod from '@tools/imgmod';
import { PreferenceManager } from '@tools/prefman';
import Speaker from '@tools/speaker';
import steve from '@assets/steve.png';
import alex from '@assets/alex.png';

export type Skin = {
  src: string;
  slim: boolean;
  image?: ImageBitmap;
};

export default abstract class SkinManager {
  private static root = new ImgMod.RootLayer(markers => this.onRootUpdate(markers));
  private static rendering = false;
  private static awaitingRerender = false;
  private static selected: ImgMod.AbstractLayer | null = null;
  private static skin: Skin = {
    src: PreferenceManager.get().showPlaceholderSkins ? steve : ImgMod.EMPTY_IMAGE_SOURCE,
    slim: false
  };

  static speaker = new Speaker(() => this.get());
  static rootSpeaker = new Speaker(() => this.getRoot());
  static selectedSpeaker = new Speaker(() => this.getSelected());

  static get = (): Skin => ({ ...this.skin });

  static getSlim = () => this.skin.slim;

  static setSlim = (slim = false) => {
    if (slim === this.skin.slim) return;
    this.skin.slim = slim;
    this.updateSkin();
  };

  static getLayers = () => this.root.getLayers();

  static getRoot = () => this.root;

  static getSelected = () => this.selected;

  static serializeLayers = () => ImgMod.Layer.CODEC.serialize(this.root);

  static deserializeLayers = async (serialized: ImgMod.FullSerializedLayer, slim = false) => {
    this.selectLayer(null);
    this.skin.slim = slim;
    this.root = await ImgMod.RootLayer.copyOf(
      await ImgMod.Layer.CODEC.deserialize(serialized),
      this.onRootUpdate
    );
    await this.root.color();
    await this.updateSkinInternal();
    this.rootSpeaker.updateListeners();
  };

  static addLayer = (layer: ImgMod.AbstractLayer, slim = this.skin.slim) => {
    this.skin.slim = slim;
    this.root.addLayer(layer);
    this.updateSkin();
  };

  static replaceLayers = async (layers: ImgMod.Layer) => {
    this.selectLayer(null);
    this.root = await ImgMod.RootLayer.copyOf(layers, this.onRootUpdate);
    this.rootSpeaker.updateListeners();
    this.updateSkin();
  };

  static reset = () => {
    this.selectLayer(null);
    this.root = new ImgMod.RootLayer(this.onRootUpdate);
    this.skin = {
      src: PreferenceManager.get().showPlaceholderSkins ? steve : ImgMod.EMPTY_IMAGE_SOURCE,
      slim: false
    };
    this.speaker.updateListeners();
    this.rootSpeaker.updateListeners();
  };

  static onRootUpdate = (update: ImgMod.SpeakerUpdate) => {
    if (this.selected && !this.selected.parent) this.selectLayer(null);
    if (
      update.markers.every(
        marker => marker !== ImgMod.ChangeMarker.Source && marker !== ImgMod.ChangeMarker.Preview
      )
    )
      return;
    this.updateSkin();
  };

  private static updateSkin: () => void = async () => await this.updateSkinInternal();

  private static updateSkinInternal = async () => {
    if (this.rendering) {
      this.awaitingRerender = true;
      return;
    }
    this.rendering = true;

    if (this.root.getLayers().length === 0) {
      this.skin.src = PreferenceManager.get().showPlaceholderSkins
        ? this.skin.slim
          ? alex
          : steve
        : ImgMod.EMPTY_IMAGE_SOURCE;
      this.skin.image?.close();
      this.skin.image = undefined;
    } else {
      await this.root.render(true, this.skin.slim, true);
      this.skin.src = this.root.src;
      this.skin.image = this.root.image;
    }

    this.speaker.updateListeners();

    this.rendering = false;
    if (this.awaitingRerender) {
      this.awaitingRerender = false;
      this.updateSkin();
    }
  };

  static selectLayer = (layer: ImgMod.AbstractLayer | null) => {
    if (this.selected === layer) return;
    if (layer) this.selectLayerInternal(layer);
    else this.selected = layer;
    this.selectedSpeaker.updateListeners();
  };

  private static selectLayerInternal = (layer: ImgMod.AbstractLayer) => {
    if (this.selected instanceof ImgMod.Img && this.selected.preview) {
      const preview = this.selected.preview;
      preview.cleanup();
      this.selected.preview = undefined;
    }

    if (layer instanceof ImgMod.Img)
      layer.preview = new ImgMod.ImgPreview(layer, () => this.selectLayer(null));

    this.selected = layer;
  };

  static setDefaultLayers: (add?: boolean) => void = async add => {
    if (!add && this.getLayers().length) return;

    const steveImg = new ImgMod.Img('normal', 'full-only');
    steveImg.name('Steve');
    await steveImg.loadUrl(steve);

    const alexImg = new ImgMod.Img('normal', 'slim-only');
    steveImg.name('Alex');
    await alexImg.loadUrl(alex);

    const layer = new ImgMod.Layer([steveImg, alexImg]);
    layer.name('Steve & Alex');

    if (add) this.addLayer(layer);
    else await this.replaceLayers(new ImgMod.Layer([layer]));
  };
}

export function useSkin(...deps: (keyof Skin)[]) {
  const [skin, setSkin] = useState(SkinManager.get());

  const setSkinConditional = useCallback(
    (newSkin: Skin) => {
      if (deps.length > 0) for (const dep of deps) if (newSkin[dep] === skin[dep]) return;
      setSkin(newSkin);
    },
    [deps, skin]
  );

  SkinManager.speaker.registerListener(setSkinConditional);
  useEffect(() => {
    SkinManager.speaker.registerListener(setSkinConditional);
    return () => SkinManager.speaker.unregisterListener(setSkinConditional);
  }, [setSkinConditional, skin]);

  return skin;
}

export function useRoot() {
  const [root, setRoot] = useState(SkinManager.getRoot());

  useEffect(() => {
    SkinManager.rootSpeaker.registerListener(setRoot);
    return () => SkinManager.rootSpeaker.unregisterListener(setRoot);
  }, [root]);

  return root;
}

export function useSelected() {
  const [selected, setSelected] = useState(SkinManager.getSelected());

  useEffect(() => {
    SkinManager.selectedSpeaker.registerListener(setSelected);
    return () => SkinManager.selectedSpeaker.unregisterListener(setSelected);
  }, [selected]);

  return selected;
}
