import React from 'react';
import {
  Manager,
  SELECT_PREFS,
  USER_THEME_COLOR_VARS,
  Prefs,
  usePrefs,
  defaultPrefs,
  WindowOrder
} from '@tools/prefman';
import PropertiesList, { Property } from '@components/basic/propertieslist';

export default function Preferences() {
  const prefs = usePrefs();

  return (
    <div className="preferences">
      <PropertiesList
        labelWidth="50%"
        stringFallback={(id, value) => {
          if (id === 'theme') Manager.setPrefs({ theme: value as Prefs['theme'] });
          if (Object.keys(USER_THEME_COLOR_VARS).includes(id)) {
            Manager.setPrefs({ [id]: value } as unknown as Pick<
              Prefs,
              keyof typeof USER_THEME_COLOR_VARS
            >);
          }
        }}
        numberFallback={(id, value) => {
          if (id === 'curvature') Manager.setPrefs({ curvature: value });
        }}
        booleanFallback={(id, value) => {
          if (id === 'autosaveSession') Manager.setPrefs({ [id]: value });
          if (id === 'useFallbackSkinSource') Manager.setPrefs({ [id]: value });
          if (id === 'showPlaceholderSkins') Manager.setPrefs({ [id]: value });
          if (id === 'autosetImageForm') Manager.setPrefs({ [id]: value });

          if (id === 'addDefaultLayer') Manager.setPrefs({ [id]: value });
          if (id === 'animatePlayerOnStart') Manager.setPrefs({ [id]: value });
          if (id === 'showLayerManagerOnStart') Manager.setPrefs({ [id]: value });
          if (id === 'showLayerEditorOnStart') Manager.setPrefs({ [id]: value });
          if (id === 'showPaperDollOnStart') Manager.setPrefs({ [id]: value });
          if (id === 'showPreviewOnStart') Manager.setPrefs({ [id]: value });
          if (id === 'showAssetCreatorOnStart') Manager.setPrefs({ [id]: value });
          if (id === 'showLayerAdderOnStart') Manager.setPrefs({ [id]: value });
          if (id === 'showModelFeaturesOnStart') Manager.setPrefs({ [id]: value });
        }}
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
                name: 'Show Layer Editor',
                id: 'showLayerEditorOnStart',
                type: 'checkbox',
                value: prefs.showLayerEditorOnStart
              },
              {
                name: 'Show Paper Doll',
                id: 'showPaperDollOnStart',
                type: 'checkbox',
                value: prefs.showPaperDollOnStart
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
                name: 'Show Layer Adder',
                id: 'showLayerAdderOnStart',
                type: 'checkbox',
                value: prefs.showLayerAdderOnStart
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
                options: prefs.windowOrder,
                onChange: windows => Manager.setPrefs({ windowOrder: windows as WindowOrder })
              }
            ]
          }
        ]}
      />
    </div>
  );
}
