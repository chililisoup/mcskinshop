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
import ModelFeatures, { Features } from '@components/special/modelfeatures';
import Preferences from '@components/special/preferences';
import DraggableWindow from '@components/basic/draggablewindow';
import LayerEditor from '@components/special/layereditor';
import AppWindow from '@components/basic/appwindow';
import { Manager } from '@tools/prefman';
import { SkinManager } from '@tools/skinman';

export type UndoCallback = () => RedoCallback;
export type RedoCallback = () => UndoCallback;

type UndoEdit = [name: string, undoCallback: RedoCallback];
type RedoEdit = [name: string, redoCallback: UndoCallback];

type StateCommon = {
  modelFeatures: Features;
  layerManager: boolean;
  layerEditor: boolean;
  paperDoll: boolean;
  preview: boolean;
  assetCreator: boolean;
  layerAdder: boolean;
  modelFeaturesWindow: boolean;
};

type SavedSession = {
  layers: ImgMod.FullSerializedLayer;
  slim: boolean;
} & StateCommon;

type AState = {
  editHints: [string, string];
  preferences: boolean;
  selectedLayer?: ImgMod.AbstractLayer;
  selectedLayerPreview?: ImgMod.ImgPreview;
  sessionKey: string;
} & StateCommon;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default class MCSkinShop extends Component<{}, AState> {
  editHistory: UndoEdit[] = [];
  redoProphecy: RedoEdit[] = [];

  state = this.defaultState();

  defaultState(): AState {
    const prefs = Manager.get();

    return {
      editHints: ['', ''],
      modelFeatures: {
        cape: { value: false },
        elytra: { value: false },
        helmet: { value: false },
        chestplate: { value: false },
        leggings: { value: false },
        boots: { value: false },
        rightItem: { value: false },
        leftItem: { value: false }
      },
      layerManager: prefs.showLayerManagerOnStart,
      layerEditor: prefs.showLayerEditorOnStart,
      paperDoll: prefs.showPaperDollOnStart,
      preview: prefs.showPreviewOnStart,
      assetCreator: prefs.showAssetCreatorOnStart,
      layerAdder: prefs.showLayerAdderOnStart,
      modelFeaturesWindow: prefs.showModelFeaturesOnStart,
      preferences: false,
      selectedLayer: undefined,
      selectedLayerPreview: undefined,
      sessionKey: Util.randomKey()
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);

    this.loadSession().catch(() => {
      if (Manager.get().addDefaultLayer) this.setDefaultLayers();
      else SkinManager.updateSkin();
    });

    // this is entirely too often
    SkinManager.rootSpeaker.registerListener(this.autosave);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);

    SkinManager.rootSpeaker.unregisterListener(this.autosave);
  }

  componentDidUpdate() {
    this.autosave();
  }

  autosave = () => {
    if (Manager.get().autosaveSession) this.saveSession();
  };

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

    if (e.key === 'z') this.requestUndo();
    else if (e.key === 'Z' || e.key === 'y') this.requestRedo();
  };

  requestUndo = () => {
    const action = this.editHistory.pop();
    if (!action) return;

    this.redoProphecy.push([action[0], action[1]()]);

    this.setState({
      editHints: [
        this.editHistory.length > 0 ? this.editHistory[this.editHistory.length - 1][0] : '',
        action[0]
      ]
    });
  };

  requestRedo = () => {
    const action = this.redoProphecy.pop();
    if (!action) return;

    this.editHistory.push([action[0], action[1]()]);

    this.setState({
      editHints: [
        action[0],
        this.redoProphecy.length > 0 ? this.redoProphecy[this.redoProphecy.length - 1][0] : ''
      ]
    });
  };

  addEdit = (name: string, undoCallback: UndoCallback) => {
    this.editHistory.push([name, undoCallback]);

    if (this.editHistory.length > 50) this.editHistory.shift();

    this.redoProphecy = [];
    this.setState({ editHints: [name, ''] });
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

  updateState = <KKey extends keyof AState>(setting: KKey, value: AState[KKey]) => {
    this.setState({ [setting]: value } as Pick<AState, KKey>);
  };

  selectForEdit = (layer: ImgMod.AbstractLayer, parent: ImgMod.Layer) => {
    const oldPrev = this.state.selectedLayerPreview;
    if (oldPrev) {
      oldPrev.cleanup();
      if (oldPrev.parent) {
        const index = oldPrev.parent.getLayers().indexOf(oldPrev);
        if (index) oldPrev.parent.removeLayer(index, false);
      }
    }

    const index = parent.getLayers().indexOf(layer);
    if (index < 0)
      return this.setState({ selectedLayer: undefined, selectedLayerPreview: undefined });

    if (layer instanceof ImgMod.Layer)
      return this.setState({ selectedLayer: layer, selectedLayerPreview: undefined });

    if (!(layer instanceof ImgMod.Img))
      return this.setState({ selectedLayer: undefined, selectedLayerPreview: undefined });

    const preview = new ImgMod.ImgPreview(layer, parent);
    parent.insertLayer(index + 1, preview);
    this.setState({ selectedLayer: layer, selectedLayerPreview: preview });
  };

  newSession = () => {
    localStorage.removeItem('savedSession');
    // having a separate thing will probably lead to spaghetti code.
    // don't let it get bad.
    localStorage.removeItem('savedViewportOptions');

    this.editHistory = [];
    this.redoProphecy = [];

    this.setState(this.defaultState());
    if (Manager.get().addDefaultLayer) this.setDefaultLayers();
    else SkinManager.reset();
  };

  saveSession: () => void = async () => {
    const serialized = JSON.stringify({
      layers: SkinManager.getLayers().length ? await SkinManager.serializeLayers() : undefined,
      slim: SkinManager.getSlim(),
      modelFeatures: this.state.modelFeatures,
      layerManager: this.state.layerManager,
      layerEditor: this.state.layerEditor,
      paperDoll: this.state.paperDoll,
      preview: this.state.preview,
      assetCreator: this.state.assetCreator,
      layerAdder: this.state.layerAdder,
      modelFeaturesWindow: this.state.modelFeaturesWindow
    } as Partial<SavedSession>);
    localStorage.setItem('savedSession', serialized);
  };

  private loadSession = async () => {
    const serialized = localStorage.getItem('savedSession');
    if (!serialized) return Promise.reject(new Error('No saved session.'));

    const session = JSON.parse(serialized) as Partial<SavedSession>;

    const defaultState = this.defaultState();
    const stateUpdate: Partial<AState> = {
      modelFeatures: session.modelFeatures ?? defaultState.modelFeatures,
      layerManager: session.layerManager ?? defaultState.layerManager,
      layerEditor: session.layerEditor ?? defaultState.layerEditor,
      paperDoll: session.paperDoll ?? defaultState.paperDoll,
      preview: session.preview ?? defaultState.preview,
      assetCreator: session.assetCreator ?? defaultState.assetCreator,
      layerAdder: session.layerAdder ?? defaultState.layerAdder,
      modelFeaturesWindow: session.modelFeaturesWindow ?? defaultState.modelFeaturesWindow
    };

    if (session.layers) await SkinManager.deserializeLayers(session.layers, session.slim);
    else SkinManager.setSlim(session.slim);

    this.setState(stateUpdate as Pick<AState, keyof AState>);

    return Promise.resolve();
  };

  render() {
    return (
      <div className="appRoot" key={this.state.sessionKey}>
        <MenuBar
          newSession={this.newSession}
          saveSession={this.saveSession}
          uploadSkin={this.uploadSkin}
          uploadDynamicSkin={this.uploadDynamicSkin}
          downloadSkin={this.downloadSkin}
          requestUndo={this.requestUndo}
          requestRedo={this.requestRedo}
          editHints={this.state.editHints}
          editTab={[['Preferences...', () => this.updateState('preferences', true)]]}
          viewTab={[
            [
              'Layer Manager',
              this.state.layerManager,
              () => this.updateState('layerManager', !this.state.layerManager)
            ],
            [
              'Layer Editor',
              this.state.layerEditor,
              () => this.updateState('layerEditor', !this.state.layerEditor)
            ],
            [
              'Paper Doll',
              this.state.paperDoll,
              () => this.updateState('paperDoll', !this.state.paperDoll)
            ],
            ['Preview', this.state.preview, () => this.updateState('preview', !this.state.preview)],
            [
              'Asset Creator',
              this.state.assetCreator,
              () => this.updateState('assetCreator', !this.state.assetCreator)
            ],
            [
              'Layer Adder',
              this.state.layerAdder,
              () => this.updateState('layerAdder', !this.state.layerAdder)
            ],
            [
              'Model Features',
              this.state.modelFeaturesWindow,
              () => this.updateState('modelFeaturesWindow', !this.state.modelFeaturesWindow)
            ]
          ]}
        />
        <div className="SkinManager">
          {this.state.layerManager && (
            <AppWindow style={{ flex: '0 0 325px' }}>
              <LayerManager
                selectForEdit={this.selectForEdit}
                selectedLayer={this.state.selectedLayer}
              />
            </AppWindow>
          )}
          {this.state.layerEditor && (
            <DraggableWindow
              title={`Layer Editor - ${this.state.selectedLayer?.name ?? 'unselected'}`}
              startPos={{ x: 350, y: 0 }}
              close={() => this.setState({ layerEditor: false })}
            >
              <LayerEditor layer={this.state.selectedLayerPreview ?? this.state.selectedLayer} />
            </DraggableWindow>
          )}
          {this.state.paperDoll && (
            <AppWindow style={{ flex: '100%' }}>
              <PaperDoll modelFeatures={this.state.modelFeatures} addEdit={this.addEdit} />
            </AppWindow>
          )}
          {this.state.preview && <Preview close={() => this.updateState('preview', false)} />}
          {this.state.assetCreator && <AssetCreator />}
          {this.state.layerAdder && (
            <AppWindow style={{ flex: '0 0 325px' }}>
              <LayerAdder addDefaultLayer={() => void this.setDefaultLayers(true)} />
            </AppWindow>
          )}
          {this.state.modelFeaturesWindow && (
            <AppWindow style={{ flex: '0 0 325px' }}>
              <ModelFeatures
                features={this.state.modelFeatures}
                updateFeatures={features => this.updateState('modelFeatures', features)}
              />
            </AppWindow>
          )}
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
