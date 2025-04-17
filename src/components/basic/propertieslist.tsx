import React, { Component } from 'react';
import * as Util from '../../tools/util';
import Slider, { SubType } from './slider';

type BaseProperty = {
  name: string;
  id: string;
  disabled?: boolean;
};

type RangeProperty = BaseProperty & {
  type: 'range';
  value: number;
  min?: number;
  max?: number;
  step?: number;
  subtype?: SubType;
};

type BoolProperty = BaseProperty & {
  type: 'checkbox';
  value: boolean;
};

type SelectProperty = BaseProperty & {
  type: 'select';
  value: string;
  options: [value: string, name?: string][] | Record<string, string>;
};

type ButtonProperty = BaseProperty & {
  type: 'button';
  label?: string;
};

type Property = RangeProperty | BoolProperty | SelectProperty | ButtonProperty;

type AProps = {
  numberCallback?: (id: string, value: number) => void;
  booleanCallback?: (id: string, value: boolean) => void;
  stringCallback?: (id: string, value: string) => void;
  buttonCallback?: (id: string) => void;
  properties: Property[];
};

class PropertiesList extends Component<AProps> {
  key = Util.randomKey();

  constructor(props: AProps) {
    super(props);
  }

  getInput = (property: Property, id: string) => {
    switch (property.type) {
      case 'range':
        return (
          <Slider
            callback={value =>
              this.props.numberCallback && this.props.numberCallback(property.id, value)
            }
            id={id}
            value={property.value}
            min={property.min}
            max={property.max}
            step={property.step}
            subtype={property.subtype}
            disabled={property.disabled}
          />
        );
      case 'checkbox':
        return (
          <span>
            <input
              id={id}
              type="checkbox"
              checked={property.value}
              disabled={property.disabled}
              onChange={e =>
                this.props.booleanCallback &&
                this.props.booleanCallback(property.id, e.target.checked)
              }
            />
          </span>
        );
      case 'select':
        return (
          <select
            id={id}
            value={property.value}
            disabled={property.disabled}
            onChange={e =>
              this.props.stringCallback && this.props.stringCallback(property.id, e.target.value)
            }
          >
            {Array.isArray(property.options)
              ? property.options.map(option => {
                  return (
                    <option value={option[0]} key={`${id}-${option[0]}`}>
                      {option[1] ?? option[0]}
                    </option>
                  );
                })
              : Object.keys(property.options).map(option => {
                  return (
                    <option value={option} key={`${id}-${option}`}>
                      {(property.options as Record<string, string>)[option] ?? option}
                    </option>
                  );
                })}
          </select>
        );
      case 'button':
        return (
          <button
            id={id}
            disabled={property.disabled}
            onClick={() => this.props.buttonCallback && this.props.buttonCallback(property.id)}
          >
            {property.label ?? property.name}
          </button>
        );
    }
  };

  addProperty = (property: Property) => {
    const id = `${property.id}-${property.type}-${this.key}`;
    const labeled = property.type !== 'button' || property.label;

    return (
      <tr key={property.id}>
        {labeled && (
          <th scope="row">
            <label htmlFor={id}>{property.name}</label>
          </th>
        )}
        <td colSpan={labeled ? 1 : 2}>{this.getInput(property, id)}</td>
      </tr>
    );
  };

  render() {
    return (
      <table className="properties-list">
        <tbody>{this.props.properties.map(this.addProperty)}</tbody>
      </table>
    );
  }
}

export default PropertiesList;
