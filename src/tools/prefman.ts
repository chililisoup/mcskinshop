export const SELECT_PREFS = {
  theme: { default: 'Purple (default)', dark: 'Dark', light: 'Light' } as const
} as const;

export type Prefs = {
  -readonly [key in keyof typeof SELECT_PREFS]: keyof (typeof SELECT_PREFS)[key];
};

export const defaultPrefs: Prefs = {
  theme: 'default'
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
    root.style.removeProperty('--highlight');
    root.style.removeProperty('--outline');

    switch (this.prefs.theme) {
      case 'default':
        break;
      case 'dark':
        root.style.setProperty('--main-bg', 'rgb(23, 26, 32)');
        root.style.setProperty('--container', 'rgb(23, 26, 32)');
        root.style.setProperty('--menu-bar', 'rgb(23, 26, 32)');
        root.style.setProperty('--outline', 'rgb(56, 55, 74)');
        break;
      case 'light':
        root.style.setProperty('--main-bg', 'rgb(125, 131, 147)');
        root.style.setProperty('--container', 'rgb(216, 225, 244)');
        root.style.setProperty('--menu-bar', 'rgb(114, 145, 217)');
        root.style.setProperty('--highlight', 'black');
        root.style.setProperty('--outline', 'rgb(232, 239, 255)');
        break;
    }
  };
}
