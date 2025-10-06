import * as Util from './util';

export const SELECT_PREFS = {
  theme: {
    user: 'User',
    dark: 'Dark (default)',
    darker: 'Darker',
    light: 'Light',
    purple: 'Purple',
    taiga: 'Taiga',
    cave: 'Cave',
    cherry: 'Cherry Blossom'
  } as const
} as const;

export const USER_THEME_COLOR_VARS = {
  '--main-bg': 'Background',
  '--container': 'Container',
  '--container-selected': 'Container - Selected',
  '--container-alt': 'Container Alt.',
  '--container-alt-text': 'Container Alt. Text',
  '--panel': 'Panel',
  '--empty-area': 'Empty Area',
  '--menu-bar': 'Menu Bar',
  '--menu-bar-text': 'Menu Bar Text',
  '--input': 'Input',
  '--input-text': 'Input Text',
  '--highlight': 'Highlight',
  '--outline': 'Outline',
  '--accent': 'Accent',
  '--no-accent': 'No Accent',
  '--shadow': 'Shadow'
} as const;

export type Prefs = {
  -readonly [key in keyof typeof SELECT_PREFS]: keyof (typeof SELECT_PREFS)[key];
} & Record<keyof typeof USER_THEME_COLOR_VARS, string> & {
    '--icon-invert': boolean;
    curvature: number;
    autosetImageForm: boolean;
    useFallbackSkinSource: boolean;
    addDefaultLayer: boolean;
    showLayerManagerOnStart: boolean;
    showLayerEditorOnStart: boolean;
    showPaperDollOnStart: boolean;
    showPreviewOnStart: boolean;
    showAssetCreatorOnStart: boolean;
    showLayerAdderOnStart: boolean;
    showModelFeaturesOnStart: boolean;
  };

export const defaultPrefs: Prefs = {
  theme: 'dark',
  '--main-bg': '#202633',
  '--container': '#434664',
  '--container-selected': '#515d9d',
  '--container-alt': '#282a3c',
  '--container-alt-text': '#ffffff',
  '--panel': '#181924',
  '--empty-area': '#181924',
  '--menu-bar': '#675892',
  '--menu-bar-text': '#ffffff',
  '--input': 'rgba(0, 0, 0, 0.4)',
  '--input-text': '#ffffff',
  '--highlight': '#ffffff',
  '--outline': '#000000',
  '--accent': '#4fc3ff',
  '--no-accent': 'rgb(255, 255, 255, 0.25)',
  '--shadow': 'rgba(0, 0, 0, 0)',
  '--icon-invert': false,
  curvature: 8,
  autosetImageForm: false,
  useFallbackSkinSource: false,
  addDefaultLayer: true,
  showLayerManagerOnStart: true,
  showLayerEditorOnStart: false,
  showPaperDollOnStart: true,
  showPreviewOnStart: true,
  showAssetCreatorOnStart: false,
  showLayerAdderOnStart: false,
  showModelFeaturesOnStart: false
} as const;

export class Manager {
  private prefs: Prefs;

  constructor() {
    this.prefs = JSON.parse(JSON.stringify(defaultPrefs)) as Prefs;
    this.combine(JSON.parse(localStorage.getItem('preferences') ?? '{}'));

    this.applyPrefs();
  }

  private combine = <TPrefs = Partial<Prefs>>(overrides: TPrefs & object) => {
    let override: keyof typeof overrides;
    for (override in overrides)
      if (override in this.prefs) (this.prefs as TPrefs)[override] = overrides[override];

    let selectPref: keyof typeof SELECT_PREFS;
    for (selectPref in SELECT_PREFS)
      if (
        Util.isKeyOfObject(selectPref, overrides) &&
        !Util.isKeyOfObject(overrides[selectPref], SELECT_PREFS[selectPref])
      )
        this.prefs[selectPref] = defaultPrefs[selectPref];
  };

  private trimPrefs = <KKey extends keyof Prefs>(prefs: Pick<Prefs, KKey>) => {
    const toSave: Partial<Prefs> = {};
    for (const pref in prefs) if (prefs[pref] !== defaultPrefs[pref]) toSave[pref] = prefs[pref];

    return toSave;
  };

  setPrefs = <KKey extends keyof Prefs>(prefs: Pick<Prefs, KKey>) => {
    this.combine(prefs);

    const toSave = this.trimPrefs(this.prefs);
    localStorage.setItem('preferences', JSON.stringify(toSave));

    this.applyPrefs();
  };

  get = () => {
    return this.prefs as Readonly<Prefs>;
  };

  private applyPrefs = () => {
    const root = document.documentElement;
    root.style = '';
    root.style.setProperty('--curvature', this.prefs.curvature + 'px');

    switch (this.prefs.theme) {
      case 'purple':
        break;
      case 'user':
        root.style.setProperty('--main-bg', this.prefs['--main-bg']);
        root.style.setProperty('--container', this.prefs['--container']);
        root.style.setProperty('--container-selected', this.prefs['--container-selected']);
        root.style.setProperty('--container-alt', this.prefs['--container-alt']);
        root.style.setProperty('--container-alt-text', this.prefs['--container-alt-text']);
        root.style.setProperty('--panel', this.prefs['--panel']);
        root.style.setProperty('--empty-area', this.prefs['--empty-area']);
        root.style.setProperty('--menu-bar', this.prefs['--menu-bar']);
        root.style.setProperty('--menu-bar-text', this.prefs['--menu-bar-text']);
        root.style.setProperty('--input', this.prefs['--input']);
        root.style.setProperty('--input-text', this.prefs['--input-text']);
        root.style.setProperty('--highlight', this.prefs['--highlight']);
        root.style.setProperty('--outline', this.prefs['--outline']);
        root.style.setProperty('--accent', this.prefs['--accent']);
        root.style.setProperty('--no-accent', this.prefs['--no-accent']);
        root.style.setProperty('--box-shadow', `0 0 2px 2px ${this.prefs['--shadow']}`);
        root.style.setProperty('--drop-shadow', `0 0 4px ${this.prefs['--shadow']}`);
        root.style.setProperty('--icon-invert', this.prefs['--icon-invert'] ? '100%' : '0%');
        break;
      case 'darker':
        root.style.setProperty('--main-bg', 'rgb(23, 26, 32)');
        root.style.setProperty('--container', 'var(--main-bg)');
        root.style.setProperty('--menu-bar', 'var(--main-bg)');
        root.style.setProperty('--outline', 'rgb(56, 55, 74)');
        root.style.setProperty('--input', 'var(--outline)');
        break;
      case 'light':
        root.style.setProperty('--main-bg', 'rgb(196, 205, 233)');
        root.style.setProperty('--container', 'rgb(216, 225, 244)');
        root.style.setProperty('--container-selected', 'rgb(158, 194, 240)');
        root.style.setProperty('--container-alt', 'rgb(188, 199, 217)');
        root.style.setProperty('--panel', 'var(--container)');
        root.style.setProperty('--empty-area', 'rgb(163, 177, 207)');
        root.style.setProperty('--menu-bar', 'rgb(194, 212, 255)');
        root.style.setProperty('--highlight', 'black');
        root.style.setProperty('--outline', 'rgb(232, 239, 255)');
        root.style.setProperty('--input', 'white');
        root.style.setProperty('--light-shadow', 'rgba(64, 94, 128, 0.25)');
        root.style.setProperty('--medium-shadow', 'rgba(32, 47, 64, 0.15)');
        root.style.setProperty('--dark-shadow', 'rgba(16, 24, 32, 0.25)');
        root.style.setProperty('--box-shadow', '0 0 2px 2px var(--dark-shadow)');
        root.style.setProperty('--drop-shadow', '0 0 4px var(--dark-shadow)');
        root.style.setProperty('--icon-invert', '100%');
        break;
      case 'taiga':
        root.style.setProperty('--main-bg', '#55382c');
        root.style.setProperty('--container', '#345e5a');
        root.style.setProperty('--container-alt', '#0e3330');
        root.style.setProperty('--panel', 'var(--medium-shadow)');
        root.style.setProperty('--empty-area', '#331e0e');
        root.style.setProperty('--menu-bar', '#1c6a88');
        root.style.setProperty('--outline', '#220c05');
        root.style.setProperty('--accent', '#31b6cc');
        root.style.setProperty('--box-shadow', '0 0 0 2px var(--dark-shadow)');
        root.style.setProperty('--drop-shadow', '0 0 2px var(--dark-shadow)');
        break;
      case 'cave':
        root.style.setProperty('--main-bg', '#575757');
        root.style.setProperty('--container', '#2a2b2c');
        root.style.setProperty('--container-selected', '#376690');
        root.style.setProperty('--container-alt', '#919191');
        root.style.setProperty('--container-alt-text', 'black');
        root.style.setProperty('--panel', '#181a25');
        root.style.setProperty('--empty-area', 'var(--panel)');
        root.style.setProperty('--menu-bar', 'var(--accent)');
        root.style.setProperty('--menu-bar-text', 'black');
        root.style.setProperty('--input', '#00000059');
        root.style.setProperty('--accent', '#0070d1');
        root.style.setProperty('--box-shadow', '0 0 2px 2px black');
        root.style.setProperty('--drop-shadow', '0 0 4px black');
        break;
      case 'cherry':
        root.style.setProperty('--main-bg', '#33202c');
        root.style.setProperty('--container', '#6a3d65');
        root.style.setProperty('--container-selected', '#795597');
        root.style.setProperty('--container-alt', '#92b2e4');
        root.style.setProperty('--container-alt-text', 'black');
        root.style.setProperty('--panel', 'var(--container)');
        root.style.setProperty('--empty-area', '#2f0513');
        root.style.setProperty('--menu-bar', 'var(--accent)');
        root.style.setProperty('--menu-bar-text', 'black');
        root.style.setProperty('--outline', '#ffc9e5');
        root.style.setProperty('--accent', '#ff91ca');
        break;
      case 'dark':
      default:
        root.style.setProperty('--container', 'var(--main-bg)');
        root.style.setProperty('--menu-bar', 'var(--main-bg)');
        root.style.setProperty('--outline', 'rgb(63, 69, 91)');
        root.style.setProperty('--input', 'var(--outline)');
    }
  };
}
