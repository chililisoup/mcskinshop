import React, { Component } from 'react';
import * as ImgMod from '../../tools/imgmod';
import * as Util from '../../tools/util';
import steve from '@assets/steve.png';
import alex from '@assets/alex.png';
import PaperDoll from './paperdoll';
import LayerManager from './layermanager';
import LayerAdder from './layeradder';
import AssetCreator from './assetcreator';
import MenuBar from './menubar';
import Preview from './preview';
import ModelFeatures, { Features } from './modelfeatures';
import Preferences from './preferences';
import * as PrefMan from '../../tools/prefman';

export type UndoCallback = () => RedoCallback;
export type RedoCallback = () => UndoCallback;

type UndoEdit = [name: string, undoCallback: RedoCallback];
type RedoEdit = [name: string, redoCallback: UndoCallback];

type AProps = object;

type AState = {
  skin: string;
  slim: boolean;
  editHints: [string, string];
  modelFeatures: Features;
  layerManager: boolean;
  paperDoll: boolean;
  preview: boolean;
  assetCreator: boolean;
  layerAdder: boolean;
  modelFeaturesWindow: boolean;
  preferences: boolean;
  prefMan: PrefMan.Manager;
};

class SkinManager extends Component<AProps, AState> {
  layers = new ImgMod.Layer();
  editHistory: UndoEdit[] = [];
  redoProphecy: RedoEdit[] = [];

  constructor(props: AProps) {
    super(props);

    this.state = {
      skin: steve,
      slim: false,
      editHints: ['', ''],
      modelFeatures: {
        cape: false,
        helmet: false,
        chestplate: false,
        leggings: false,
        boots: false
      },
      layerManager: true,
      paperDoll: true,
      preview: true,
      assetCreator: false,
      layerAdder: false,
      modelFeaturesWindow: false,
      preferences: false,
      prefMan: new PrefMan.Manager()
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
    void this.setDefaultLayers();
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate = () => {
    Util.setSlim(this.state.slim);
  };

  setDefaultLayers = async (add?: boolean) => {
    if (!add && this.layers.getLayers().length) return;

    const steveImg = new ImgMod.Img('normal', 'full-only');
    steveImg.name = 'Steve';
    await steveImg.render(steve);

    const alexImg = new ImgMod.Img('normal', 'slim-only');
    alexImg.name = 'Alex';
    await alexImg.render(alex);

    const layer = new ImgMod.Layer([steveImg, alexImg]);
    layer.name = 'Steve & Alex';

    if (add) this.layers.addLayer(layer);
    else this.layers = new ImgMod.Layer([layer]);
    this.updateSkin();
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

  updateSkin: (slim?: boolean) => void = async slim => {
    slim ??= this.state.slim;
    Util.setSlim(slim);

    await this.layers.render();
    this.setState({ skin: this.layers.src, slim: slim });
  };

  addLayer = (layer: ImgMod.AbstractLayer) => {
    this.layers.addLayer(layer);
    this.updateSkin();
  };

  getSkinFromUsername = async (username: string) => {
    const fallback = `https://minotar.net/skin/${username}`;

    if (this.state.prefMan.get().useFallbackSkinSource) return fallback;

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
    this.addLayer(image);
    const slim = image.detectSlimModel();
    if (this.state.prefMan.get().autosetImageForm)
      image.form = slim ? 'slim-stretch' : 'full-squish-inner';
    this.updateSkin(slim);
  };

  uploadSkin: (name: string, url?: string) => void = async (name, url) => {
    url ??= await this.getSkinFromUsername(name);

    const image = new ImgMod.Img();
    image.name = name;

    await image.render(url);
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

    image.internalUpdateCallback = () => this.updateSkin();
    image.observeDynamic(fileHandle);

    await image.render(URL.createObjectURL(file));
    this.processSkinUpload(image);
  };

  downloadSkin: () => void = async () => {
    if (this.state.skin) await Util.download('My Skin.png', this.state.skin);
  };

  updateState = <KKey extends keyof AState>(setting: KKey, value: AState[KKey]) => {
    this.setState({ [setting]: value } as Pick<AState, KKey>);
  };

  render() {
    return (
      <div className="appRoot">
        <MenuBar
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
            <LayerManager
              layers={this.layers}
              updateLayers={this.updateSkin}
              slim={this.state.slim}
              manager={this.state.prefMan}
            />
          )}
          {this.state.paperDoll && (
            <PaperDoll
              skin={this.state.skin}
              slim={this.state.slim}
              updateSlim={this.updateSkin}
              modelFeatures={this.state.modelFeatures}
              addEdit={this.addEdit}
            />
          )}
          {this.state.preview && (
            <Preview skin={this.state.skin} close={() => this.updateState('preview', false)} />
          )}
          {this.state.assetCreator && <AssetCreator addLayer={this.addLayer} />}
          {this.state.layerAdder && (
            <LayerAdder
              addLayer={this.addLayer}
              addDefaultLayer={() => void this.setDefaultLayers(true)}
            />
          )}
          {this.state.modelFeaturesWindow && (
            <ModelFeatures
              updateFeatures={features => this.updateState('modelFeatures', features)}
            />
          )}
          {this.state.preferences && (
            <Preferences
              manager={this.state.prefMan}
              updatePrefs={manager => this.setState({ prefMan: manager })}
              close={() => this.updateState('preferences', false)}
            />
          )}
        </div>
      </div>
    );
  }
}

export default SkinManager;
