import React from 'react';
import {
  PreferenceManager,
  SELECT_PREFS,
  USER_THEME_COLOR_VARS,
  Prefs,
  usePrefs,
  defaultPrefs,
  WindowOrder,
  WINDOWS
} from '@tools/prefman';
import PropertiesList, { Property } from '@components/basic/propertieslist';
import * as Util from '@tools/util';

export default function Preferences() {
  const prefs = usePrefs();

  return (
    <div className="preferences">
      <PropertiesList
        labelWidth="50%"
        stringFallback={(id, value) => {
          if (id === 'theme') PreferenceManager.setPrefs({ theme: value as Prefs['theme'] });
          if (Object.keys(USER_THEME_COLOR_VARS).includes(id)) {
            PreferenceManager.setPrefs({ [id]: value } as unknown as Pick<
              Prefs,
              keyof typeof USER_THEME_COLOR_VARS
            >);
          }
        }}
        numberFallback={(id, value) =>
          Util.isKeyOfObject(id, defaultPrefs) && PreferenceManager.setPref(id, value)
        }
        booleanFallback={(id, value) =>
          Util.isKeyOfObject(id, defaultPrefs) && PreferenceManager.setPref(id, value)
        }
        properties={[
          {
            name: 'Curvature',
            id: 'curvature',
            type: 'range',
            value: prefs.curvature,
            max: 16,
            enforceStep: true
          },
          {
            name: 'Theme',
            id: 'theme',
            type: 'select',
            value: prefs.theme,
            options: SELECT_PREFS.theme
          },
          {
            name: 'User Theme Colors',
            id: 'userThemeColors',
            type: 'section',
            disabled: prefs.theme !== 'user',
            properties: Object.entries(USER_THEME_COLOR_VARS).map(([key, value]): Property => {
              return {
                name: value,
                id: key,
                type: 'color',
                value: prefs[key as keyof typeof USER_THEME_COLOR_VARS],
                resetValue: defaultPrefs[key as keyof typeof USER_THEME_COLOR_VARS],
                controlled: true,
                alpha: true
              };
            })
          },
          {
            id: 'themingDivider',
            type: 'divider'
          },
          {
            name: 'Autosave Session',
            id: 'autosaveSession',
            type: 'checkbox',
            value: prefs.autosaveSession
          },
          {
            name: 'Autoset Image Form',
            id: 'autosetImageForm',
            type: 'checkbox',
            value: prefs.autosetImageForm
          },
          {
            name: 'Use Fallback Skin Source',
            id: 'useFallbackSkinSource',
            type: 'checkbox',
            value: prefs.useFallbackSkinSource
          },
          {
            name: 'Show Placeholder Skins',
            id: 'showPlaceholderSkins',
            type: 'checkbox',
            value: prefs.showPlaceholderSkins
          },
          {
            id: 'newSessionDivider',
            type: 'divider'
          },
          {
            name: 'On New Session',
            id: 'newSessionPreferences',
            type: 'section',
            properties: [
              {
                name: 'Add Default Layer',
                id: 'addDefaultLayer',
                type: 'checkbox',
                value: prefs.addDefaultLayer
              },
              {
                name: 'Animate Player',
                id: 'animatePlayerOnStart',
                type: 'checkbox',
                value: prefs.animatePlayerOnStart
              },
              {
                name: 'Show Layer Manager',
                id: 'showLayerManagerOnStart',
                type: 'checkbox',
                value: prefs.showLayerManagerOnStart
              },
              {
                name: 'Show 2D Editor',
                id: 'showLayerEditorOnStart',
                type: 'checkbox',
                value: prefs.showLayerEditorOnStart
              },
              {
                name: 'Show 3D Viewport',
                id: 'showPaperDollOnStart',
                type: 'checkbox',
                value: prefs.showViewportOnStart
              },
              {
                name: 'Show Preview',
                id: 'showPreviewOnStart',
                type: 'checkbox',
                value: prefs.showPreviewOnStart
              },
              {
                name: 'Show Asset Creator',
                id: 'showAssetCreatorOnStart',
                type: 'checkbox',
                value: prefs.showAssetCreatorOnStart
              },
              {
                name: 'Show Asset Library',
                id: 'showLayerAdderOnStart',
                type: 'checkbox',
                value: prefs.showAssetLibraryOnStart
              },
              {
                name: 'Show Model Features',
                id: 'showModelFeaturesOnStart',
                type: 'checkbox',
                value: prefs.showModelFeaturesOnStart
              }
            ]
          },
          {
            name: 'Window Order',
            id: 'windowOrderSection',
            type: 'section',
            properties: [
              {
                name: 'Window Order',
                id: 'windowOrder',
                type: 'orderableList',
                options: prefs.windowOrder.map(id => ({ id: id, name: WINDOWS[id] })),
                onChange: options =>
                  PreferenceManager.setPrefs({ windowOrder: options.map(option => option.id) as WindowOrder })
              }
            ]
          }
        ]}
      />
    </div>
  );
}
