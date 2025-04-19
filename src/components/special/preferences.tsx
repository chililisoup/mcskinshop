import React, { Component } from 'react';
import * as PrefMan from '../../tools/prefman';
import DraggableWindow from '../basic/draggablewindow';
import PropertiesList from '../basic/propertieslist';

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
    return (
      <DraggableWindow title="Preferences" anchor={{ vw: 0.5, vh: 0.5 }} close={this.props.close}>
        <div className="preferences">
          <PropertiesList
            stringCallback={(id, value) => {
              if (id === 'theme')
                this.props.manager.setPrefs({ theme: value as PrefMan.Prefs['theme'] });
              if (
                PrefMan.USER_THEME_COLOR_VARS.includes(
                  id as (typeof PrefMan.USER_THEME_COLOR_VARS)[number]
                )
              ) {
                this.props.manager.setPrefs({ [id]: value } as unknown as Pick<
                  PrefMan.Prefs,
                  (typeof PrefMan.USER_THEME_COLOR_VARS)[number]
                >);
              }
              this.props.updatePrefs(this.props.manager);
            }}
            numberCallback={(id, value) => {
              if (id === 'curvature') this.props.manager.setPrefs({ curvature: value });
              this.props.updatePrefs(this.props.manager);
            }}
            properties={[
              {
                name: 'Curvature',
                id: 'curvature',
                type: 'range',
                value: this.props.manager.get().curvature,
                max: 16
              },
              {
                name: 'Theme',
                id: 'theme',
                type: 'select',
                value: this.props.manager.get().theme,
                options: PrefMan.SELECT_PREFS.theme
              },
              {
                name: 'User Theme Colors',
                id: 'userThemeColors',
                type: 'section',
                disabled: this.props.manager.get().theme !== 'user',
                properties: [
                  {
                    name: 'Background',
                    id: '--main-bg',
                    type: 'color',
                    value: this.props.manager.get()['--main-bg'],
                    alpha: true
                  },
                  {
                    name: 'Container',
                    id: '--container',
                    type: 'color',
                    value: this.props.manager.get()['--container'],
                    alpha: true
                  },
                  {
                    name: 'Container Alt.',
                    id: '--container-alt',
                    type: 'color',
                    value: this.props.manager.get()['--container-alt'],
                    alpha: true
                  },
                  {
                    name: 'C.A. Text',
                    id: '--container-alt-text',
                    type: 'color',
                    value: this.props.manager.get()['--container-alt-text'],
                    alpha: true
                  },
                  {
                    name: 'Panel',
                    id: '--panel',
                    type: 'color',
                    value: this.props.manager.get()['--panel'],
                    alpha: true
                  },
                  {
                    name: 'Empty Area',
                    id: '--empty-area',
                    type: 'color',
                    value: this.props.manager.get()['--empty-area'],
                    alpha: true
                  },
                  {
                    name: 'Menu Bar',
                    id: '--menu-bar',
                    type: 'color',
                    value: this.props.manager.get()['--menu-bar'],
                    alpha: true
                  },
                  {
                    name: 'M.B. Text',
                    id: '--menu-bar-text',
                    type: 'color',
                    value: this.props.manager.get()['--menu-bar-text'],
                    alpha: true
                  },
                  {
                    name: 'Input',
                    id: '--input',
                    type: 'color',
                    value: this.props.manager.get()['--input'],
                    alpha: true
                  },
                  {
                    name: 'Highlight',
                    id: '--highlight',
                    type: 'color',
                    value: this.props.manager.get()['--highlight'],
                    alpha: true
                  },
                  {
                    name: 'Outline',
                    id: '--outline',
                    type: 'color',
                    value: this.props.manager.get()['--outline'],
                    alpha: true
                  },
                  {
                    name: 'Accent',
                    id: '--accent',
                    type: 'color',
                    value: this.props.manager.get()['--accent'],
                    alpha: true
                  },
                  {
                    name: 'No Accent',
                    id: '--no-accent',
                    type: 'color',
                    value: this.props.manager.get()['--no-accent'],
                    alpha: true
                  },
                  {
                    name: 'Shadow',
                    id: '--shadow',
                    type: 'color',
                    value: this.props.manager.get()['--shadow'],
                    alpha: true
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
