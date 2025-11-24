export const SELECT_PREFS = {
  theme: {
    user: 'User',
    highContrast: 'High Contrast',
    dark: 'Dark (default)',
    darker: 'Darker',
    light: 'Light',
    catppuccinMocha: 'Catppuccin Mocha',
    catppuccinMacchiato: 'Catppuccin Macchiato',
    catppuccinFrappe: 'Catppuccin Frappé',
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

export const WINDOWS = {
  layerManager: 'Layer Manager',
  layerEditor: '2D Editor',
  viewport: '3D Viewport',
  assetLibrary: 'Asset Library',
  modelFeatures: 'Model Features'
} as const;
export type OrderableWindow = keyof typeof WINDOWS;
export type WindowOrder = [
  OrderableWindow,
  OrderableWindow,
  OrderableWindow,
  OrderableWindow,
  OrderableWindow
];

export type Prefs = {
  -readonly [key in keyof typeof SELECT_PREFS]: keyof (typeof SELECT_PREFS)[key];
} & Record<keyof typeof USER_THEME_COLOR_VARS, string> & {
    curvature: number;
    autosaveSession: boolean;
    autosetImageForm: boolean;
    useFallbackSkinSource: boolean;
    showPlaceholderSkins: boolean;
    addDefaultLayer: boolean;
    animatePlayerOnStart: boolean;
    showLayerManagerOnStart: boolean;
    showLayerEditorOnStart: boolean;
    showViewportOnStart: boolean;
    showColorPaletteOnStart: boolean;
    showPreviewOnStart: boolean;
    showAssetCreatorOnStart: boolean;
    showAssetLibraryOnStart: boolean;
    showModelFeaturesOnStart: boolean;
    windowOrder: WindowOrder;
  };

export const DEFAULT_PREFS: Prefs = {
  theme: 'dark',
  '--main-bg': 'hsla(221,23%,16%,1)',
  '--text': 'hsla(0,0%,100%,1)',
  '--container': 'hsla(235,20%,33%,1)',
  '--container-selected': 'hsla(231,32%,47%,1)',
  '--container-alt': 'hsla(234,20%,20%,1)',
  '--container-alt-text': 'hsla(0,0%,100%,1)',
  '--panel': 'hsla(235,21%,12%,1)',
  '--empty-area': 'hsla(235,21%,12%,1)',
  '--menu-bar': 'hsla(256,25%,46%,1)',
  '--menu-bar-text': 'hsla(0,0%,100%,1)',
  '--input': 'hsla(0,0%,0%,0.4)',
  '--input-text': 'hsla(0,0%,100%,1)',
  '--highlight': 'hsla(0,0%,100%,1)',
  '--outline': 'hsla(0,0%,0%,1)',
  '--accent': 'hsla(200,100%,66%,1)',
  '--no-accent': 'hsla(0,0%,100%,0.25)',
  '--shadow': 'hsla(0,0%,0%,0)',
  curvature: 8,
  autosaveSession: true,
  autosetImageForm: false,
  useFallbackSkinSource: false,
  showPlaceholderSkins: true,
  addDefaultLayer: true,
  animatePlayerOnStart: true,
  showLayerManagerOnStart: true,
  showLayerEditorOnStart: false,
  showViewportOnStart: true,
  showColorPaletteOnStart: false,
  showPreviewOnStart: true,
  showAssetCreatorOnStart: false,
  showAssetLibraryOnStart: false,
  showModelFeaturesOnStart: false,
  windowOrder: ['layerManager', 'layerEditor', 'viewport', 'assetLibrary', 'modelFeatures']
} as const;

export const CATPPUCCIN_THEMES = {
  catppuccinMocha: {
    lavender: '#b4befe',
    blue: '#89b4fa',
    sky: '#89dceb',
    teal: '#94e2d5',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    peach: '#fab387',
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
    text: '#cdd6f4'
  },
  catppuccinMacchiato: {
    lavender: '#b7bdf8',
    blue: '#8aadf4',
    sky: '#91d7e3',
    teal: '#8bd5ca',
    green: '#a6da95',
    yellow: '#eed49f',
    peach: '#f5a97f',
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
    text: '#cad3f5'
  },
  catppuccinFrappe: {
    lavender: '#babbf1',
    blue: '#8caaee',
    sky: '#99d1db',
    teal: '#81c8be',
    green: '#a6d189',
    yellow: '#e5c890',
    peach: '#ef9f76',
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
    text: '#c6d0f5'
  },
  catppuccinLatte: {
    lavender: '#7287fd',
    blue: '#1e66f5',
    sky: '#04a5e5',
    teal: '#179299',
    green: '#40a02b',
    yellow: '#df8e1d',
    peach: '#fe640b',
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
    text: '#4c4f69'
  }
};
