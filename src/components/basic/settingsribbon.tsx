import React from 'react';
import PropertiesList, { Property } from '@components/basic/propertieslist';

export default class SettingsRibbon extends PropertiesList {
  override getInput = (property: Property, id: string) => {
    return property.type === 'checkbox'
      ? [
          <input
            id={id}
            type="checkbox"
            checked={property.value}
            disabled={property.disabled}
            onChange={e => this.props.booleanFallback?.(property.id, e.target.checked)}
          />
        ]
      : super.getInput(property, id);
  };

  override addProperty = (property: Property) => {
    const id = this.getId(property);
    const labeled = this.isLabeled(property);
    const input = this.getInputSet(property, id);

    return labeled ? (
      <span key={property.id}>
        <label htmlFor={id}>{property.name}</label>
        {input}
      </span>
    ) : (
      input
    );
  };

  override render() {
    return <span className="settings-ribbon">{this.props.properties.map(this.addProperty)}</span>;
  }
}
