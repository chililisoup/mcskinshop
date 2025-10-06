import React, { Component } from 'react';
import * as PrefMan from '../../tools/prefman';
import DraggableWindow from '../basic/draggablewindow';
import PropertiesList, { Property } from '../basic/propertieslist';

type AProps = {
  manager: PrefMan.Manager;
  updatePrefs: (manager: PrefMan.Manager) => void;
  close: () => void;
};

class Preferences extends Component<AProps> {
  constructor(props: AProps) {
    super(props);
  }

  updateSize = (size: number) => this.setState({ size: size });

  render() {
    const values = this.props.manager.get();

    return (
      <DraggableWindow title="Preferences" anchor={{ vw: 0.5, vh: 0.5 }} close={this.props.close}>
        <div className="preferences">
          <PropertiesList
            stringCallback={(id, value) => {
              if (id === 'theme')
                this.props.manager.setPrefs({ theme: value as PrefMan.Prefs['theme'] });
              if (Object.keys(PrefMan.USER_THEME_COLOR_VARS).includes(id)) {
                this.props.manager.setPrefs({ [id]: value } as unknown as Pick<
                  PrefMan.Prefs,
                  keyof typeof PrefMan.USER_THEME_COLOR_VARS
                >);
              }
              this.props.updatePrefs(this.props.manager);
            }}
            numberCallback={(id, value) => {
              if (id === 'curvature') this.props.manager.setPrefs({ curvature: value });
              this.props.updatePrefs(this.props.manager);
            }}
            booleanCallback={(id, value) => {
              if (id === '--icon-invert') this.props.manager.setPrefs({ [id]: value });
              if (id === 'useFallbackSkinSource') this.props.manager.setPrefs({ [id]: value });
              if (id === 'autosetImageForm') this.props.manager.setPrefs({ [id]: value });

              if (id === 'addDefaultLayer') this.props.manager.setPrefs({ [id]: value });
              if (id === 'showLayerManagerOnStart') this.props.manager.setPrefs({ [id]: value });
              if (id === 'showLayerEditorOnStart') this.props.manager.setPrefs({ [id]: value });
              if (id === 'showPaperDollOnStart') this.props.manager.setPrefs({ [id]: value });
              if (id === 'showPreviewOnStart') this.props.manager.setPrefs({ [id]: value });
              if (id === 'showAssetCreatorOnStart') this.props.manager.setPrefs({ [id]: value });
              if (id === 'showLayerAdderOnStart') this.props.manager.setPrefs({ [id]: value });
              if (id === 'showModelFeaturesOnStart') this.props.manager.setPrefs({ [id]: value });

              this.props.updatePrefs(this.props.manager);
            }}
            properties={[
              {
                name: 'Curvature',
                id: 'curvature',
                type: 'range',
                value: values.curvature,
                max: 16
              },
              {
                name: 'Theme',
                id: 'theme',
                type: 'select',
                value: values.theme,
                options: PrefMan.SELECT_PREFS.theme
              },
              {
                name: 'User Theme Colors',
                id: 'userThemeColors',
                type: 'section',
                disabled: values.theme !== 'user',
                properties: (
                  Object.entries(PrefMan.USER_THEME_COLOR_VARS).map(([key, value]) => {
                    return {
                      name: value,
                      id: key,
                      type: 'color',
                      value: values[key as keyof typeof PrefMan.USER_THEME_COLOR_VARS],
                      alpha: true
                    };
                  }) as Property[]
                ).concat([
                  {
                    name: 'Icon Invert',
                    id: '--icon-invert',
                    type: 'checkbox',
                    value: values['--icon-invert']
                  }
                ])
              },
              {
                name: 'Autoset Image Form',
                id: 'autosetImageForm',
                type: 'checkbox',
                value: values.autosetImageForm
              },
              {
                name: 'Use Fallback Skin Source',
                id: 'useFallbackSkinSource',
                type: 'checkbox',
                value: values.useFallbackSkinSource
              },
              {
                name: 'Startup',
                id: 'startupPreferences',
                type: 'section',
                properties: [
                  {
                    name: 'Add Default Layer',
                    id: 'addDefaultLayer',
                    type: 'checkbox',
                    value: values.addDefaultLayer
                  },
                  {
                    name: 'Show Layer Manager',
                    id: 'showLayerManagerOnStart',
                    type: 'checkbox',
                    value: values.showLayerManagerOnStart
                  },
                  {
                    name: 'Show Layer Editor',
                    id: 'showLayerEditorOnStart',
                    type: 'checkbox',
                    value: values.showLayerEditorOnStart
                  },
                  {
                    name: 'Show Paper Doll',
                    id: 'showPaperDollOnStart',
                    type: 'checkbox',
                    value: values.showPaperDollOnStart
                  },
                  {
                    name: 'Show Preview',
                    id: 'showPreviewOnStart',
                    type: 'checkbox',
                    value: values.showPreviewOnStart
                  },
                  {
                    name: 'Show Asset Creator',
                    id: 'showAssetCreatorOnStart',
                    type: 'checkbox',
                    value: values.showAssetCreatorOnStart
                  },
                  {
                    name: 'Show Layer Adder',
                    id: 'showLayerAdderOnStart',
                    type: 'checkbox',
                    value: values.showLayerAdderOnStart
                  },
                  {
                    name: 'Show Model Features',
                    id: 'showModelFeaturesOnStart',
                    type: 'checkbox',
                    value: values.showModelFeaturesOnStart
                  }
                ]
              }
            ]}
          />
        </div>
      </DraggableWindow>
    );
  }
}

export default Preferences;
