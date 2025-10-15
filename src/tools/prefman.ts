import * as Util from './util';

export const SELECT_PREFS = {
  theme: {
    user: 'User',
    dark: 'Dark (default)',
    darker: 'Darker',
    light: 'Light',
    catppuccinMocha: 'Catppuccin Mocha',
    catppuccinMacchiato: 'Catppuccin Macchiato',
    catppuccinFrappe: 'Catppuccin Frappe',
    catppuccinLatte: 'Catppuccin Latte',
    purple: 'Purple',
    taiga: 'Taiga',
    cave: 'Cave'
  } as const
} as const;

export const USER_THEME_COLOR_VARS = {
  '--main-bg': 'Background',
  '--text': 'Text',
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
    animatePlayerOnStart: boolean;
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
  '--text': '#ffffff',
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
  animatePlayerOnStart: true,
  showLayerManagerOnStart: true,
  showLayerEditorOnStart: false,
  showPaperDollOnStart: true,
  showPreviewOnStart: true,
  showAssetCreatorOnStart: false,
  showLayerAdderOnStart: false,
  showModelFeaturesOnStart: false
} as const;

const CATPPUCCIN_THEMES = {
  catppuccinMocha: {
    lavender: '#b4befe',
    blue: '#89b4fa',
    sky: '#89dceb',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    red: '#f38ba8',
    mauve: '#cba6f7',
    pink: '#f5c2e7',
    rosewater: '#f5e0dc',
    crust: '#11111B',
    mantle: '#181825',
    base: '#1e1e2e',
    surface0: '#313244',
    surface1: '#45475a',
    overlay0: '#6c7086',
    overlay1: '#7f849c',
    overlay2: '#9399b2',
    text: '#cdd6f4',
    textFilter:
      'brightness(0) saturate(100%) invert(84%) sepia(20%) saturate(276%) hue-rotate(190deg) brightness(97%) contrast(97%)'
  },
  catppuccinMacchiato: {
    lavender: '#b7bdf8',
    blue: '#8aadf4',
    sky: '#91d7e3',
    green: '#a6da95',
    yellow: '#eed49f',
    red: '#ed8796',
    mauve: '#c6a0f6',
    pink: '#f5bde6',
    rosewater: '#f4dbd6',
    crust: '#181926',
    mantle: '#1e2030',
    base: '#24273a',
    surface0: '#363a4f',
    surface1: '#494d64',
    overlay0: '#6e738d',
    overlay1: '#8087a2',
    overlay2: '#939ab7',
    text: '#cad3f5',
    textFilter:
      'brightness(0) saturate(100%) invert(79%) sepia(37%) saturate(189%) hue-rotate(192deg) brightness(101%) contrast(92%)'
  },
  catppuccinFrappe: {
    lavender: '#babbf1',
    blue: '#8caaee',
    sky: '#99d1db',
    green: '#a6d189',
    yellow: '#e5c890',
    red: '#e78284',
    mauve: '#ca9ee6',
    pink: '#f4b8e4',
    rosewater: '#f2d5cf',
    crust: '#232634',
    mantle: '#292c3c',
    base: '#303446',
    surface0: '#414559',
    surface1: '#51576d',
    overlay0: '#737994',
    overlay1: '#838ba7',
    overlay2: '#949cbb',
    text: '#c6d0f5',
    textFilter:
      'brightness(0) saturate(100%) invert(81%) sepia(23%) saturate(304%) hue-rotate(191deg) brightness(99%) contrast(94%)'
  },
  catppuccinLatte: {
    lavender: '#7287fd',
    blue: '#1e66f5',
    sky: '#04a5e5',
    green: '#40a02b',
    yellow: '#df8e1d',
    red: '#d20f39',
    mauve: '#8839ef',
    pink: '#ea76cb',
    rosewater: '#dc8a78',
    crust: '#dce0e8',
    mantle: '#e6e9ef',
    base: '#eff1f5',
    surface0: '#ccd0da',
    surface1: '#bcc0cc',
    overlay0: '#9ca0b0',
    overlay1: '#8c8fa1',
    overlay2: '#7c7f93',
    text: '#4c4f69',
    textFilter:
      'brightness(0) saturate(100%) invert(29%) sepia(7%) saturate(1770%) hue-rotate(196deg) brightness(99%) contrast(90%)'
  }
};

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
        root.style.setProperty('--text', this.prefs['--text']);
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
      case 'catppuccinMocha':
      case 'catppuccinMacchiato':
      case 'catppuccinFrappe':
      case 'catppuccinLatte': {
        const theme = CATPPUCCIN_THEMES[this.prefs.theme];
        root.style.setProperty('--main-bg', theme.base);
        root.style.setProperty('--text', theme.text);
        root.style.setProperty('--container', theme.crust);
        root.style.setProperty('--container-selected', theme.base);
        root.style.setProperty('--container-selected-outline', theme.sky);
        root.style.setProperty('--container-alt', theme.base);
        root.style.setProperty('--container-alt-text', theme.text);
        root.style.setProperty('--active-window-outline', theme.lavender);
        root.style.setProperty('--active-draggable-window-outline', theme.lavender);
        root.style.setProperty('--inactive-draggable-window-outline', theme.overlay0);
        root.style.setProperty('--panel', theme.crust);
        root.style.setProperty('--panel-content', theme.mantle);
        root.style.setProperty('--empty-area', theme.mantle);
        root.style.setProperty('--filled-area', theme.surface0);
        root.style.setProperty('--menu-bar', theme.crust);
        root.style.setProperty('--menu-bar-text', theme.text);
        root.style.setProperty('--menu-bar-outline', theme.yellow);
        root.style.setProperty('--highlight', theme.lavender);
        root.style.setProperty('--outline', 'none');
        root.style.setProperty('--line', theme.overlay0);
        root.style.setProperty('--accent', theme.blue);
        root.style.setProperty('--input', theme.surface0);
        root.style.setProperty('--input-text', theme.text);
        root.style.setProperty('--input-text-alt', theme.surface0);
        root.style.setProperty('--input-outline', theme.surface1);
        root.style.setProperty('--popup-outline', theme.green);
        root.style.setProperty('--light-shadow', `rgb(from ${theme.overlay2} r g b / 30%)`);
        root.style.setProperty('--medium-shadow', `rgb(from ${theme.surface0} r g b / 30%)`);
        root.style.setProperty('--dark-shadow', `rgb(from ${theme.crust} r g b / 30%)`);
        root.style.setProperty('--icon-filter', theme.textFilter);

        if (this.prefs.theme === 'catppuccinLatte') {
          root.style.setProperty('--dark-shadow', `rgb(from ${theme.text} r g b / 40%)`);
          root.style.setProperty('--box-shadow', '0 0 4px var(--dark-shadow)');
          root.style.setProperty('--drop-shadow', '0 0 4px var(--dark-shadow)');
        }
        break;
      }
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
        root.style.setProperty('--container-selected-outline', 'var(--outline)');
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
      case 'dark':
      default:
        root.style.setProperty('--container', 'var(--main-bg)');
        root.style.setProperty('--menu-bar', 'var(--main-bg)');
        root.style.setProperty('--outline', 'rgb(63, 69, 91)');
        root.style.setProperty('--input', 'var(--outline)');
    }
  };
}
