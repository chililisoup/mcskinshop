import * as ImgMod from '@tools/imgmod';
import * as Util from '@tools/util';
import { PreferenceManager } from '@tools/prefman';
import SkinManager from '@tools/skinman';

export default abstract class SkinDealer {
  static downloadSkin: () => void = () => Util.download('My Skin.png', SkinManager.get().src);

  static processSkinUpload = (image: ImgMod.Img) => {
    const slim = image.detectSlimModel();
    if (PreferenceManager.get().autosetImageForm) image.form(slim ? 'slim-stretch' : 'full-squish-inner');
    SkinManager.addLayer(image, slim);
  };

  static uploadSkin: (name: string, url?: string) => void = async (name, url) => {
    url ??= await this.getSkinFromUsername(name);

    const image = new ImgMod.Img();
    image.name = name;

    await image.loadUrl(url);
    this.processSkinUpload(image);
  };

  static uploadDynamicSkin: () => void = async () => {
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

  static getSkinFromUsername = async (username: string) => {
    const fallback = `https://minotar.net/skin/${username}`;

    if (PreferenceManager.get().useFallbackSkinSource) return fallback;

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
}
