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
              this.props.updatePrefs(this.props.manager);
            }}
            properties={[
              {
                name: 'Theme',
                id: 'theme',
                type: 'select',
                value: this.props.manager.get().theme,
                options: PrefMan.SELECT_PREFS.theme
              }
            ]}
          />
        </div>
      </DraggableWindow>
    );
  }
}

export default Preferences;
