export const SELECT_PREFS = {
  theme: {
    default: 'Purple (default)',
    dark: 'Dark',
    darker: 'Darker',
    light: 'Light',
    taiga: 'Taiga',
    cherry: 'Cherry Blossom'
  } as const
} as const;

export type Prefs = {
  -readonly [key in keyof typeof SELECT_PREFS]: keyof (typeof SELECT_PREFS)[key];
} & {
  curvature: number;
};

export const defaultPrefs: Prefs = {
  theme: 'default',
  curvature: 4
} as const;

export class Manager {
  private prefs: Prefs;

  constructor() {
    this.prefs = JSON.parse(JSON.stringify(defaultPrefs)) as Prefs;
    this.combine(JSON.parse(localStorage.getItem('preferences') ?? '{}') as Partial<Prefs>);

    this.applyPrefs();
  }

  private combine = <TPrefs = Partial<Prefs>>(overrides: TPrefs) => {
    for (const pref in overrides) (this.prefs as TPrefs)[pref] = overrides[pref];
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
    root.style.removeProperty('--main-bg');
    root.style.removeProperty('--container');
    root.style.removeProperty('--menu-bar');
    root.style.removeProperty('--menu-bar-text');
    root.style.removeProperty('--highlight');
    root.style.removeProperty('--outline');
    root.style.removeProperty('--input');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--light-shadow');
    root.style.removeProperty('--medium-shadow');
    root.style.removeProperty('--dark-shadow');
    root.style.removeProperty('--box-shadow');
    root.style.removeProperty('--drop-shadow');
    root.style.removeProperty('--icon-invert');

    root.style.setProperty('--curvature', this.prefs.curvature + 'px');

    switch (this.prefs.theme) {
      case 'default':
        break;
      case 'dark':
        root.style.setProperty('--container', 'var(--main-bg)');
        root.style.setProperty('--menu-bar', 'var(--main-bg)');
        root.style.setProperty('--outline', 'rgb(63, 69, 91)');
        root.style.setProperty('--input', 'var(--outline)');
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
        root.style.setProperty('--menu-bar', 'rgb(194, 212, 255)');
        root.style.setProperty('--highlight', 'black');
        root.style.setProperty('--outline', 'rgb(232, 239, 255)');
        root.style.setProperty('--input', 'white');
        root.style.setProperty('--light-shadow', 'rgba(64, 94, 128, 0.25)');
        root.style.setProperty('--medium-shadow', 'rgba(32, 47, 64, 0.15)');
        root.style.setProperty('--dark-shadow', 'rgba(16, 24, 32, 0.15)');
        root.style.setProperty('--box-shadow', '0 0 2px 2px var(--dark-shadow)');
        root.style.setProperty('--drop-shadow', '0 0 4px var(--dark-shadow)');
        root.style.setProperty('--icon-invert', '100%');
        break;
      case 'taiga':
        root.style.setProperty('--main-bg', '#55382c');
        root.style.setProperty('--container', '#345e5a');
        root.style.setProperty('--menu-bar', '#1c6a88');
        root.style.setProperty('--outline', '#220c05');
        root.style.setProperty('--accent', '#31b6cc');
        root.style.setProperty('--box-shadow', '0 0 0 2px var(--dark-shadow)');
        break;
      case 'cherry':
        root.style.setProperty('--main-bg', '#33202c');
        root.style.setProperty('--container', '#6a3d65');
        root.style.setProperty('--menu-bar', 'var(--accent)');
        root.style.setProperty('--menu-bar-text', 'black');
        root.style.setProperty('--outline', 'rgb(15, 0, 14)');
        root.style.setProperty('--accent', '#ff91ca');
        break;
    }
  };
}
