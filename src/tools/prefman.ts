import { useEffect, useState } from 'react';
import * as Util from '@tools/util';
import Speaker from '@tools/speaker';
import { CATPPUCCIN_THEMES, DEFAULT_PREFS, Prefs, SELECT_PREFS, WINDOWS } from '@tools/prefconsts';

export abstract class PreferenceManager {
  static speaker = new Speaker(() => this.get());
  private static prefs = this.clean(
    this.combine({ ...DEFAULT_PREFS }, JSON.parse(localStorage.getItem('preferences') ?? '{}'))
  );

  private static clean(prefs: Prefs) {
    if (prefs.windowOrder.length !== DEFAULT_PREFS.windowOrder.length)
      prefs.windowOrder = [...DEFAULT_PREFS.windowOrder];
    else {
      const unseen = [...DEFAULT_PREFS.windowOrder];

      let invalid = false;
      for (const window of prefs.windowOrder) {
        if (!Object.keys(WINDOWS).includes(window)) {
          invalid = true;
          break;
        }

        const index = unseen.indexOf(window);
        if (index < 0) {
          invalid = true;
          break;
        }

        unseen.splice(index, 1);
      }

      prefs.windowOrder = invalid ? [...DEFAULT_PREFS.windowOrder] : [...prefs.windowOrder];
    }

    return prefs;
  }

  private static combine<TPrefs = Partial<Prefs>>(prefs: Prefs, overrides: TPrefs & object) {
    let override: keyof typeof overrides;
    for (override in overrides)
      if (override in prefs) (prefs as TPrefs)[override] = overrides[override];

    let selectPref: keyof typeof SELECT_PREFS;
    for (selectPref in SELECT_PREFS)
      if (
        Util.isKeyOfObject(selectPref, overrides) &&
        !Util.isKeyOfObject(overrides[selectPref], SELECT_PREFS[selectPref])
      )
        prefs[selectPref] = DEFAULT_PREFS[selectPref];

    return prefs;
  }

  private static trimPrefs = <KKey extends keyof Prefs>(prefs: Pick<Prefs, KKey>) => {
    const toSave: Partial<Prefs> = {};
    for (const pref in prefs) if (prefs[pref] !== DEFAULT_PREFS[pref]) toSave[pref] = prefs[pref];

    return toSave;
  };

  static setPrefs = <KKey extends keyof Prefs>(prefs: Pick<Prefs, KKey>) => {
    this.combine(this.prefs, prefs);

    const toSave = this.trimPrefs(this.prefs);
    localStorage.setItem('preferences', JSON.stringify(toSave));

    this.applyPrefs();
  };

  static setPref = <KKey extends keyof Prefs>(pref: KKey, value: Prefs[KKey]) =>
    this.setPrefs({ [pref]: value } as Pick<Prefs, KKey>);

  static get = (): Prefs => ({ ...this.prefs });

  static applyPrefs = () => {
    const root = document.documentElement;
    root.style = '';
    root.style.setProperty(
      '--curvature',
      (this.prefs.curvature === 0 ? -10 : this.prefs.curvature) + 'px'
    );

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
        break;
      case 'highContrast':
        root.style.setProperty('--main-bg', 'black');
        root.style.setProperty('--container', 'black');
        root.style.setProperty('--container-selected', '#44004d');
        root.style.setProperty('--container-alt', 'black');
        root.style.setProperty('--panel', 'var(--container-selected)');
        root.style.setProperty('--empty-area', 'black');
        root.style.setProperty('--menu-bar', 'black');
        root.style.setProperty('--menu-bar-text', 'white');
        root.style.setProperty('--menu-bar-outline', '#ff00ff');
        root.style.setProperty('--highlight', '#ffff00');
        root.style.setProperty('--outline', 'none');
        root.style.setProperty('--line', '#00ff00');
        root.style.setProperty('--accent', '#00ffff');
        root.style.setProperty('--no-accent', '#27d335');
        root.style.setProperty('--hovered-accent', '#ffff00');
        root.style.setProperty('--danger', '#ff0000');
        root.style.setProperty('--input', 'black');
        root.style.setProperty('--input-text', 'white');
        root.style.setProperty('--popup-outline', '#ffff00');
        root.style.setProperty('--box-shadow', '0 0 0 2px #00ffff');
        root.style.setProperty('--active-draggable-window-outline', '#ff00ff');
        root.style.setProperty('--inactive-draggable-window-outline', 'var(--no-accent)');
        root.style.setProperty('--viewport-widget', 'white');
        root.style.setProperty('--viewport-part-selected-outline', '#ff00ff');
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
        root.style.setProperty('--line', 'var(--empty-area)');
        root.style.setProperty('--no-accent', 'rgb(64, 64, 64)');
        root.style.setProperty('--input', 'white');
        root.style.setProperty('--light-shadow', 'rgba(64, 94, 128, 0.25)');
        root.style.setProperty('--medium-shadow', 'rgba(32, 47, 64, 0.15)');
        root.style.setProperty('--dark-shadow', 'rgba(16, 24, 32, 0.25)');
        root.style.setProperty('--box-shadow', '0 0 2px 2px var(--dark-shadow)');
        root.style.setProperty('--drop-shadow', '0 0 4px rgba(16, 24, 32, 0.5)');
        break;
      case 'catppuccinMocha':
      case 'catppuccinMacchiato':
      case 'catppuccinFrappe':
      case 'catppuccinLatte': {
        const theme = CATPPUCCIN_THEMES[this.prefs.theme];
        root.style.setProperty('--main-bg', theme.base);
        root.style.setProperty('--text', theme.text);
        root.style.setProperty('--container', theme.mantle);
        root.style.setProperty('--container-selected', theme.base);
        root.style.setProperty('--container-selected-outline', theme.sky);
        root.style.setProperty('--container-alt', theme.base);
        root.style.setProperty('--container-alt-text', theme.text);
        root.style.setProperty('--viewport-ui', theme.crust);
        root.style.setProperty('--viewport-widget', theme.overlay2);
        root.style.setProperty('--viewport-part-selected-outline', theme.peach);
        root.style.setProperty('--active-window-outline', theme.lavender);
        root.style.setProperty('--active-draggable-window-outline', theme.lavender);
        root.style.setProperty('--inactive-draggable-window-outline', theme.overlay0);
        root.style.setProperty('--panel', theme.crust);
        root.style.setProperty('--panel-content', theme.base);
        root.style.setProperty('--empty-area', theme.crust);
        root.style.setProperty('--filled-area', theme.surface0);
        root.style.setProperty('--menu-bar', theme.crust);
        root.style.setProperty('--menu-bar-text', theme.text);
        root.style.setProperty('--menu-bar-outline', theme.yellow);
        root.style.setProperty('--highlight', theme.lavender);
        root.style.setProperty('--outline', 'none');
        root.style.setProperty('--line', theme.overlay0);
        root.style.setProperty('--accent', theme.blue);
        root.style.setProperty('--no-accent', theme.overlay2);
        root.style.setProperty('--danger', theme.red);
        root.style.setProperty('--input', theme.surface0);
        root.style.setProperty('--input-text', theme.text);
        root.style.setProperty('--input-text-alt', theme.surface0);
        root.style.setProperty('--input-outline', theme.surface1);
        root.style.setProperty('--popup-outline', theme.green);
        root.style.setProperty('--light-shadow', `rgb(from ${theme.overlay2} r g b / 30%)`);
        root.style.setProperty('--medium-shadow', `rgb(from ${theme.surface0} r g b / 30%)`);
        root.style.setProperty(
          '--dark-shadow',
          this.prefs.theme === 'catppuccinLatte'
            ? `rgb(from ${theme.text} r g b / 40%)`
            : `rgb(from ${theme.crust} r g b / 30%)`
        );
        root.style.setProperty('--box-shadow', '0 0 4px var(--dark-shadow)');
        root.style.setProperty('--drop-shadow', '0 0 4px var(--dark-shadow)');
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

    this.speaker.updateListeners();
  };
}

export function usePrefs(...deps: (keyof Prefs)[]) {
  const [prefs, updatePrefs] = useState(PreferenceManager.get());

  useEffect(() => {
    const updatePrefsConditional = (newPrefs: Prefs) => {
      if (deps.length === 0) return updatePrefs(newPrefs);
      for (const dep of deps) if (prefs[dep] !== newPrefs[dep]) return updatePrefs(newPrefs);
    };

    PreferenceManager.speaker.registerListener(updatePrefsConditional);
    return () => PreferenceManager.speaker.unregisterListener(updatePrefsConditional);
  }, [prefs, deps]);

  return prefs;
}

PreferenceManager.applyPrefs();
