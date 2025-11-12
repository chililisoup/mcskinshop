import React, { Component } from 'react';
import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import steve from '@assets/steve.png';
import alex from '@assets/alex.png';
import PaperDoll from '@components/special/viewport/paperdoll';
import LayerManager from '@components/special/layermanager';
import LayerAdder from '@components/special/layeradder';
import AssetCreator from '@components/special/assetcreator';
import MenuBar from '@components/special/menubar';
import Preview from '@components/special/preview';
import ModelFeatures from '@components/special/modelfeatures';
import Preferences from '@components/special/preferences';
import DraggableWindow from '@components/basic/draggablewindow';
import LayerEditor from '@components/special/layereditor';
import AppWindow from '@components/basic/appwindow';
import { Manager, OrderableWindow, Prefs, WindowOrder } from '@tools/prefman';
import SkinManager from '@tools/skinman';
import EditManager from '@tools/editman';
import ModelFeatureManager, { FeatureKey, FeatureType } from '@tools/modelfeatureman';
import DraggableDivider from '@components/basic/draggabledivider';

type StateCommon = {
  layerManager: boolean;
  layerEditor: boolean;
  viewport: boolean;
  preview: boolean;
  assetCreator: boolean;
  assetLibrary: boolean;
  modelFeaturesWindow: boolean;
};

type SavedSession = {
  layers?: ImgMod.FullSerializedLayer;
  modelFeatures: Partial<Record<FeatureType, FeatureKey>>;
  slim: boolean;
} & StateCommon;

type WindowWidths = {
  layerManagerWidth: number;
  layerEditorWidth: number;
  assetLibraryWidth: number;
  modelFeaturesWidth: number;
};

type AState = {
  preferences: boolean;
  sessionKey: string;
  windowOrder: WindowOrder;
} & WindowWidths &
  StateCommon;

export default class MCSkinShop extends Component<object, AState> {
  autosaveTimeout?: NodeJS.Timeout;

  state = this.defaultState();

  defaultState(): AState {
    const prefs = Manager.get();

    return {
      layerManager: prefs.showLayerManagerOnStart,
      layerManagerWidth: 325,
      layerEditor: prefs.showLayerEditorOnStart,
      layerEditorWidth: 325,
      viewport: prefs.showViewportOnStart,
      preview: prefs.showPreviewOnStart,
      assetCreator: prefs.showAssetCreatorOnStart,
      assetLibrary: prefs.showAssetLibraryOnStart,
      assetLibraryWidth: 325,
      modelFeaturesWindow: prefs.showModelFeaturesOnStart,
      modelFeaturesWidth: 325,
      preferences: false,
      windowOrder: Manager.get().windowOrder,
      sessionKey: Util.randomKey()
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);

    this.loadSession().catch(() => {
      if (Manager.get().addDefaultLayer) this.setDefaultLayers();
      else SkinManager.updateSkin();
    });

    if (this.autosaveTimeout) clearInterval(this.autosaveTimeout);
    this.autosaveTimeout = setInterval(this.autosave, 5000);

    Manager.speaker.registerListener(this.updateWindowOrder);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);

    SkinManager.rootSpeaker.unregisterListener(this.autosave);

    if (this.autosaveTimeout) clearInterval(this.autosaveTimeout);
    this.autosaveTimeout = undefined;

    Manager.speaker.unregisterListener(this.updateWindowOrder);
  }

  autosave = () => Manager.get().autosaveSession && !document.hidden && this.saveSession();

  updateWindowOrder = (prefs: Prefs) =>
    prefs.windowOrder !== this.state.windowOrder &&
    this.setState({ windowOrder: prefs.windowOrder });

  setDefaultLayers: (add?: boolean) => void = async add => {
    if (!add && SkinManager.getLayers().length) return;

    const steveImg = new ImgMod.Img('normal', 'full-only');
    steveImg.name = 'Steve';
    await steveImg.loadUrl(steve);

    const alexImg = new ImgMod.Img('normal', 'slim-only');
    alexImg.name = 'Alex';
    await alexImg.loadUrl(alex);

    const layer = new ImgMod.Layer([steveImg, alexImg]);
    layer.name = 'Steve & Alex';

    if (add) SkinManager.addLayer(layer);
    else SkinManager.replaceLayers(new ImgMod.Layer([layer]));
  };

  onKeyDown = (e: KeyboardEvent) => {
    if (!e.ctrlKey) return;

    if (
      document.hasFocus() &&
      document.activeElement instanceof HTMLInputElement &&
      document.activeElement.type !== 'checkbox' &&
      document.activeElement.type !== 'range'
    )
      return;

    if (e.key === 'z') EditManager.requestUndo();
    else if (e.key === 'Z' || e.key === 'y') EditManager.requestRedo();
    else if (e.key === 's') {
      this.saveSession();
      e.preventDefault();
      e.stopPropagation();
    }
  };

  getSkinFromUsername = async (username: string) => {
    const fallback = `https://minotar.net/skin/${username}`;

    if (Manager.get().useFallbackSkinSource) return fallback;

    try {
      const uuidResponse = await fetch(
        Util.corsProxy(`https://api.mojang.com/users/profiles/minecraft/${username}`)
      );
      if (!uuidResponse.ok) throw new Error(`UUID response status: ${uuidResponse.status}`);

      const uuidJson: unknown = await uuidResponse.json();
      if (
        !(
          uuidJson &&
          typeof uuidJson === 'object' &&
          'id' in uuidJson &&
          typeof uuidJson.id === 'string'
        )
      )
        throw new Error('UUID not found.');

      const skinResponse = await fetch(
        Util.corsProxy(`https://sessionserver.mojang.com/session/minecraft/profile/${uuidJson.id}`)
      );
      if (!skinResponse.ok) throw new Error(`Skin response status: ${skinResponse.status}`);

      const skinJson: unknown = await skinResponse.json();
      if (
        !(
          skinJson &&
          typeof skinJson === 'object' &&
          'properties' in skinJson &&
          skinJson.properties &&
          typeof skinJson.properties === 'object' &&
          0 in skinJson.properties &&
          skinJson.properties[0] &&
          typeof skinJson.properties[0] === 'object' &&
          'value' in skinJson.properties[0] &&
          typeof skinJson.properties[0].value === 'string'
        )
      )
        throw new Error('Skin not found.');

      const texturesJson: unknown = JSON.parse(Util.b64ToUtf8(skinJson.properties[0].value));
      if (
        !(
          texturesJson &&
          typeof texturesJson === 'object' &&
          'textures' in texturesJson &&
          texturesJson.textures &&
          typeof texturesJson.textures === 'object' &&
          'SKIN' in texturesJson.textures &&
          texturesJson.textures.SKIN &&
          typeof texturesJson.textures.SKIN === 'object' &&
          'url' in texturesJson.textures.SKIN &&
          typeof texturesJson.textures.SKIN.url === 'string'
        )
      )
        throw new Error('Unable to read skin textures JSON');

      return texturesJson.textures.SKIN.url;
    } catch (error) {
      console.error(error);
      console.log('Using fallback API.');

      return fallback;
    }
  };

  processSkinUpload = (image: ImgMod.Img) => {
    const slim = image.detectSlimModel();
    if (Manager.get().autosetImageForm) image.form(slim ? 'slim-stretch' : 'full-squish-inner');
    SkinManager.addLayer(image, slim);
  };

  uploadSkin: (name: string, url?: string) => void = async (name, url) => {
    url ??= await this.getSkinFromUsername(name);

    const image = new ImgMod.Img();
    image.name = name;

    await image.loadUrl(url);
    this.processSkinUpload(image);
  };

  uploadDynamicSkin: () => void = async () => {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Minecraft skin image files',
          accept: {
            'image/png': ['.png']
          }
        }
      ],
      startIn: 'pictures'
    });

    const file = await fileHandle.getFile();
    const image = new ImgMod.Img();
    image.name = file.name;

    image.internalUpdateCallback = () => SkinManager.updateSkin();
    image.observeDynamic(fileHandle);

    await image.loadUrl(URL.createObjectURL(file));
    this.processSkinUpload(image);
  };

  downloadSkin: () => void = () => Util.download('My Skin.png', SkinManager.get().src);

  updateState = <KKey extends keyof AState>(setting: KKey, value: AState[KKey]) =>
    this.setState({ [setting]: value } as Pick<AState, KKey>);

  updateWidth = <KKey extends keyof WindowWidths>(setting: KKey, delta: number) =>
    this.updateState(
      setting,
      Util.clamp(this.state[setting] + delta, 200, window.innerWidth * 0.67)
    );

  newSession = () => {
    localStorage.removeItem('savedSession');
    // having a separate thing will probably lead to spaghetti code.
    // don't let it get bad.
    localStorage.removeItem('savedViewportOptions');

    EditManager.clear();
    ModelFeatureManager.resetUsedFeatures();

    this.setState(this.defaultState());
    if (Manager.get().addDefaultLayer) this.setDefaultLayers();
    else SkinManager.reset();
  };

  saveSession: () => void = async () => {
    const sessionSave: SavedSession = {
      layers: SkinManager.getLayers().length ? await SkinManager.serializeLayers() : undefined,
      slim: SkinManager.getSlim(),
      modelFeatures: ModelFeatureManager.getTrimmedUsedFeatures(),
      layerManager: this.state.layerManager,
      layerEditor: this.state.layerEditor,
      viewport: this.state.viewport,
      preview: this.state.preview,
      assetCreator: this.state.assetCreator,
      assetLibrary: this.state.assetLibrary,
      modelFeaturesWindow: this.state.modelFeaturesWindow
    };

    const serialized = JSON.stringify(sessionSave);
    localStorage.setItem('savedSession', serialized);
  };

  private loadSession = async () => {
    const serialized = localStorage.getItem('savedSession');
    if (!serialized) return Promise.reject(new Error('No saved session.'));

    const session = JSON.parse(serialized) as Partial<SavedSession>;

    const defaultState = this.defaultState();
    const stateUpdate: Partial<AState> = {
      layerManager: session.layerManager ?? defaultState.layerManager,
      layerEditor: session.layerEditor ?? defaultState.layerEditor,
      viewport: session.viewport ?? defaultState.viewport,
      preview: session.preview ?? defaultState.preview,
      assetCreator: session.assetCreator ?? defaultState.assetCreator,
      assetLibrary: session.assetLibrary ?? defaultState.assetLibrary,
      modelFeaturesWindow: session.modelFeaturesWindow ?? defaultState.modelFeaturesWindow
    };

    if (session.layers) await SkinManager.deserializeLayers(session.layers, session.slim);
    else SkinManager.setSlim(session.slim);

    if (session.modelFeatures) ModelFeatureManager.setUsedFeatures(session.modelFeatures);

    this.setState(stateUpdate as Pick<AState, keyof AState>);

    return Promise.resolve();
  };

  render() {
    const windows: Record<
      OrderableWindow,
      [key: keyof AState, window: false | React.JSX.Element, widthKey?: keyof WindowWidths]
    > = {
      layerManager: [
        'layerManager',
        this.state.layerManager && (
          <AppWindow key="layerManager" style={{ flex: `0 0 ${this.state.layerManagerWidth}px` }}>
            <LayerManager />
          </AppWindow>
        ),
        'layerManagerWidth'
      ],
      layerEditor: [
        'layerEditor',
        this.state.layerEditor && (
          <AppWindow key="layerEditor" style={{ flex: `0 0 ${this.state.layerEditorWidth}px` }}>
            <LayerEditor />
          </AppWindow>
        ),
        'layerEditorWidth'
      ],
      viewport: [
        'viewport',
        this.state.viewport && (
          <AppWindow style={{ flex: '100%' }}>
            <PaperDoll />
          </AppWindow>
        )
      ],
      assetLibrary: [
        'assetLibrary',
        this.state.assetLibrary && (
          <AppWindow key="assetLibrary" style={{ flex: `0 0 ${this.state.assetLibraryWidth}px` }}>
            <LayerAdder addDefaultLayer={() => void this.setDefaultLayers(true)} />
          </AppWindow>
        ),
        'assetLibraryWidth'
      ],
      modelFeatures: [
        'modelFeaturesWindow',
        this.state.modelFeaturesWindow && (
          <AppWindow
            key="modelFeaturesWindow"
            style={{ flex: `0 0 ${this.state.modelFeaturesWidth}px` }}
          >
            <ModelFeatures />
          </AppWindow>
        ),
        'modelFeaturesWidth'
      ]
    };

    const windowElements: React.JSX.Element[] = [];
    const viewportIndex = this.state.windowOrder.indexOf('viewport');
    this.state.windowOrder.forEach((window, index) => {
      const [key, elem, widthKey] = windows[window];
      if (!elem) return;
      if (index === viewportIndex) windowElements.push(elem);
      if (!widthKey) return;

      const reverse = index > viewportIndex;
      const divider = (
        <DraggableDivider
          key={key + 'Divider'}
          onChange={delta => this.updateWidth(widthKey, reverse ? -delta : delta)}
        />
      );

      const elements = reverse ? [divider, elem] : [elem, divider];
      windowElements.push(...elements);
    });

    return (
      <div className="appRoot" key={this.state.sessionKey}>
        <MenuBar
          newSession={this.newSession}
          saveSession={this.saveSession}
          uploadSkin={this.uploadSkin}
          uploadDynamicSkin={this.uploadDynamicSkin}
          downloadSkin={this.downloadSkin}
          editTab={[['Preferences...', () => this.updateState('preferences', true)]]}
          viewTab={[
            [
              'Layer Manager',
              this.state.layerManager,
              () => this.updateState('layerManager', !this.state.layerManager)
            ],
            [
              '2D Editor',
              this.state.layerEditor,
              () => this.updateState('layerEditor', !this.state.layerEditor)
            ],
            [
              '3D Viewport',
              this.state.viewport,
              () => this.updateState('viewport', !this.state.viewport)
            ],
            ['Preview', this.state.preview, () => this.updateState('preview', !this.state.preview)],
            [
              'Asset Creator',
              this.state.assetCreator,
              () => this.updateState('assetCreator', !this.state.assetCreator)
            ],
            [
              'Asset Library',
              this.state.assetLibrary,
              () => this.updateState('assetLibrary', !this.state.assetLibrary)
            ],
            [
              'Model Features',
              this.state.modelFeaturesWindow,
              () => this.updateState('modelFeaturesWindow', !this.state.modelFeaturesWindow)
            ]
          ]}
        />
        <div className="SkinManager">
          {windowElements}
          {this.state.preview && <Preview close={() => this.updateState('preview', false)} />}
          {this.state.assetCreator && <AssetCreator />}
          {this.state.preferences && (
            <DraggableWindow
              title="Preferences"
              anchor={{ vw: 0.5, vh: 0.5 }}
              close={() => this.updateState('preferences', false)}
            >
              <Preferences />
            </DraggableWindow>
          )}
        </div>
      </div>
    );
  }
}
