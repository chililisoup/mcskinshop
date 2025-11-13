import * as ImgMod from '@tools/imgmod';
import Speaker from '@tools/speaker';
import { OpenWindows } from '@components/special/mcskinshop';
import { PreferenceManager } from '@tools/prefman';
import ModelFeatureManager, { FeatureKey, FeatureType } from '@tools/modelfeatureman';
import SkinManager from '@tools/skinman';
import EditManager from '@tools/editman';
import { ViewportOptions } from '@components/special/viewport/paperdoll';

type SavedSession = {
  layers?: ImgMod.FullSerializedLayer;
  usedModelFeatures: Partial<Record<FeatureType, FeatureKey>>;
  slim: boolean;
  openWindows: Partial<OpenWindows>;
  viewportOptions: Partial<ViewportOptions>;
};

type SessionCache = {
  openWindows: Partial<OpenWindows>;
  viewportOptions: Partial<ViewportOptions>;
};

export default abstract class SessionManager {
  static emptySessionCache = (): SessionCache => ({
    openWindows: {},
    viewportOptions: {}
  });
  private static sessionCache = this.emptySessionCache();
  static initialized = false;

  static speaker = new Speaker();

  static get = (): SessionCache => ({
    openWindows: { ...this.sessionCache.openWindows },
    viewportOptions: { ...this.sessionCache.viewportOptions }
  });

  static updateCache = <KKey extends keyof SessionCache>(key: KKey, value: SessionCache[KKey]) =>
    (this.sessionCache[key] = { ...value });

  static init = async () => {
    if (this.initialized) return;
    this.initialized = true;

    const loaded = await this.loadSession();
    if (!loaded) this.newSession();

    setInterval(this.autosave, 5000);
  };

  static autosave = () =>
    PreferenceManager.get().autosaveSession && !document.hidden && SessionManager.saveSession();

  static newSession = () => {
    localStorage.removeItem('savedSession');

    EditManager.clear();
    ModelFeatureManager.resetUsedFeatures();

    this.sessionCache = this.emptySessionCache();

    if (PreferenceManager.get().addDefaultLayer) SkinManager.setDefaultLayers();
    else SkinManager.reset();

    this.speaker.updateListeners();
  };

  static saveSession: () => void = async () => {
    const sessionSave: SavedSession = {
      layers: SkinManager.getLayers().length ? await SkinManager.serializeLayers() : undefined,
      slim: SkinManager.getSlim(),
      usedModelFeatures: ModelFeatureManager.getTrimmedUsedFeatures(),
      openWindows: this.sessionCache.openWindows,
      viewportOptions: this.sessionCache.viewportOptions
    };

    const serialized = JSON.stringify(sessionSave);
    localStorage.setItem('savedSession', serialized);
  };

  private static loadSession = async () => {
    const serialized = localStorage.getItem('savedSession');
    if (!serialized) return false;

    const session = JSON.parse(serialized) as Partial<SavedSession>;

    this.sessionCache = {
      openWindows: { ...session.openWindows },
      viewportOptions: { ...session.viewportOptions }
    };

    if (session.layers) await SkinManager.deserializeLayers(session.layers, session.slim);
    else SkinManager.setSlim(session.slim);

    if (session.usedModelFeatures) ModelFeatureManager.setUsedFeatures(session.usedModelFeatures);

    this.speaker.updateListeners();

    return true;
  };
}
