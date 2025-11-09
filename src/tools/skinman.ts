import * as ImgMod from '@tools/imgmod';
import { Manager } from '@tools/prefman';
import Speaker from '@tools/speaker';
import { useEffect, useState } from 'react';
import steve from '@assets/steve.png';
import alex from '@assets/alex.png';

export type Skin = {
  src: string;
  slim: boolean;
};

export abstract class SkinManager {
  private static root = new ImgMod.RootLayer(() => this.rootSpeaker.updateListeners());
  private static rendering = false;
  private static awaitingRerender = false;
  private static skin: Skin = {
    src: Manager.get().showPlaceholderSkins ? steve : ImgMod.EMPTY_IMAGE_SOURCE,
    slim: false
  };

  static speaker = new Speaker(() => this.get());
  static rootSpeaker = new Speaker(() => this.getRoot());

  static get = (): Skin => ({ ...this.skin });

  static getSlim = () => this.skin.slim;

  static setSlim = (slim = false) => {
    if (slim === this.skin.slim) return;
    this.skin.slim = slim;
    this.updateSkin();
  };

  static getLayers = () => this.root.getLayers();

  static getRoot = () => this.root;

  static serializeLayers = () => ImgMod.Layer.CODEC.serialize(this.root);

  static deserializeLayers = async (serialized: ImgMod.FullSerializedLayer, slim = false) => {
    this.skin.slim = slim;
    this.root = ImgMod.RootLayer.of(
      await ImgMod.Layer.CODEC.deserialize(serialized),
      this.rootSpeaker.updateListeners
    );
    await this.root.color();
    await this.updateSkinInternal();
  };

  static addLayer = (layer: ImgMod.AbstractLayer, slim = this.skin.slim) => {
    this.skin.slim = slim;
    this.root.addLayer(layer);
    this.updateSkin();
  };

  static replaceLayers = (layers: ImgMod.Layer) => {
    this.root = ImgMod.RootLayer.of(layers, this.rootSpeaker.updateListeners);
    this.updateSkin();
  };

  static reset = () => {
    this.root = new ImgMod.RootLayer(this.rootSpeaker.updateListeners);
    this.skin = {
      src: Manager.get().showPlaceholderSkins ? steve : ImgMod.EMPTY_IMAGE_SOURCE,
      slim: false
    };
    this.speaker.updateListeners();
    this.rootSpeaker.updateListeners();
  };

  static updateSkin: () => void = async () => await this.updateSkinInternal();

  private static updateSkinInternal = async () => {
    if (this.rendering) {
      this.awaitingRerender = true;
      return;
    }
    this.rendering = true;

    if (this.root.getLayers().length === 0) {
      this.skin.src = Manager.get().showPlaceholderSkins
        ? this.skin.slim
          ? alex
          : steve
        : ImgMod.EMPTY_IMAGE_SOURCE;
    } else {
      await this.root.render(true, this.skin.slim);
      this.skin.src = this.root.src;
    }

    this.speaker.updateListeners();
    this.rootSpeaker.updateListeners();

    this.rendering = false;
    if (this.awaitingRerender) {
      this.awaitingRerender = false;
      this.updateSkin();
      return;
    }
  };
}

export function useSkin() {
  const [skin, setSkin] = useState(SkinManager.get());

  SkinManager.speaker.registerListener(setSkin);
  useEffect(() => {
    SkinManager.speaker.registerListener(setSkin);
    return () => SkinManager.speaker.unregisterListener(setSkin);
  }, [skin]);

  return skin;
}

export function useRoot() {
  const [root, setRootObj] = useState([SkinManager.getRoot()] as [root: ImgMod.RootLayer]);

  useEffect(() => {
    const setRoot = (root: ImgMod.RootLayer) => setRootObj([root]);

    SkinManager.rootSpeaker.registerListener(setRoot);
    return () => SkinManager.rootSpeaker.unregisterListener(setRoot);
  });

  return root[0];
}
