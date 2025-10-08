import React, { Component } from 'react';
import * as Util from '@tools/util';
import Slider, { SubType } from '@components/basic/slider';
import ColorPicker from '@components/basic/colorpicker';
import Dropdown from '@components/basic/dropdown';
import FileInput from '@components/basic/fileinput';

type BaseProperty = {
  name: string;
  id: string;
  disabled?: boolean;
  unlabeled?: boolean;
  siblings?: Property[];
};

type RangeProperty = BaseProperty & {
  type: 'range';
  value: number;
  min?: number;
  max?: number;
  step?: number;
  snap?: number;
  subtype?: SubType;
};

type BoolProperty = BaseProperty & {
  type: 'checkbox';
  value: boolean;
};

type SelectProperty = BaseProperty & {
  type: 'select';
  value?: string;
  options: readonly ([value: string, name?: string] | string)[] | Record<string, string>;
};

type ButtonProperty = BaseProperty & {
  type: 'button';
  label?: string;
  onClick?: () => void;
};

type FileProperty = BaseProperty & {
  type: 'file';
  label?: string;
  accept?: string;
};

type ColorProperty = BaseProperty & {
  type: 'color';
  value: string;
  alpha?: boolean;
  controlled?: boolean;
};

type SectionProperty = BaseProperty & {
  type: 'section';
  properties: Property[];
};

export type Property =
  | RangeProperty
  | BoolProperty
  | SelectProperty
  | ButtonProperty
  | FileProperty
  | ColorProperty
  | SectionProperty;

type AProps = {
  numberCallback?: (id: string, value: number) => void;
  booleanCallback?: (id: string, value: boolean) => void;
  stringCallback?: (id: string, value: string) => void;
  buttonFallback?: (id: string) => void;
  fileCallback?: (id: string, value: File, name: string) => void;
  properties: Property[];
};

export default class PropertiesList extends Component<AProps> {
  key = Util.randomKey();

  constructor(props: AProps) {
    super(props);
  }

  getInput(property: Property, id: string) {
    switch (property.type) {
      case 'range':
        return [
          <Slider
            callback={value => this.props.numberCallback?.(property.id, value)}
            id={id}
            value={property.value}
            min={property.min}
            max={property.max}
            step={property.step}
            snap={property.snap}
            subtype={property.subtype}
            disabled={property.disabled}
          />
        ];
      case 'checkbox':
        return [
          <span>
            <input
              id={id}
              type="checkbox"
              checked={property.value}
              disabled={property.disabled}
              onChange={e => this.props.booleanCallback?.(property.id, e.target.checked)}
            />
          </span>
        ];
      case 'select':
        return [
          <select
            id={id}
            value={property.value}
            disabled={property.disabled}
            onChange={e => this.props.stringCallback?.(property.id, e.target.value)}
          >
            {Array.isArray(property.options)
              ? property.options.map(option => {
                  return Array.isArray(option) ? (
                    <option value={(option as string[])[0]} key={`${id}-${option[0]}`}>
                      {option[1] ?? option[0]}
                    </option>
                  ) : (
                    <option value={option as string} key={`${id}-${option}`}>
                      {option}
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
        ];
      case 'button':
        return [
          <button
            id={id}
            disabled={property.disabled}
            onClick={property.onClick ?? (() => this.props.buttonFallback?.(property.id))}
          >
            {property.label ?? property.name}
          </button>
        ];
      case 'file':
        return [
          <FileInput
            id={id}
            accept={property.accept}
            disabled={property.disabled}
            callback={(value, name) => this.props.fileCallback?.(property.id, value, name)}
          >
            {property.label ?? property.name}
          </FileInput>
        ];
      case 'color':
        return [
          <ColorPicker
            id={id}
            disabled={property.disabled}
            default={property.value}
            alpha={property.alpha}
            controlled={property.controlled}
            update={value => this.props.stringCallback?.(property.id, value)}
          />
        ];
      case 'section':
        return property.disabled
          ? []
          : [
              <Dropdown title={property.name}>
                <PropertiesList
                  numberCallback={this.props.numberCallback}
                  booleanCallback={this.props.booleanCallback}
                  stringCallback={this.props.stringCallback}
                  buttonFallback={this.props.buttonFallback}
                  properties={property.properties}
                />
                <hr />
              </Dropdown>
            ];
    }
  }

  getInputSet = (property: Property, id: string) => {
    const input = this.getInput(property, id);
    return property.siblings
      ? input.concat(
          ...property.siblings.map(sibling =>
            this.getInput(sibling, `${id}-${sibling.id}-${sibling.type}`)
          )
        )
      : input;
  };

  getId = (property: Property) => {
    return `${property.id}-${property.type}-${this.key}`;
  };

  isLabeled = (property: Property) => {
    return (
      !property.unlabeled &&
      property.type !== 'section' &&
      ((property.type !== 'button' && property.type !== 'file') || property.label)
    );
  };

  addProperty = (property: Property): React.JSX.Element | React.JSX.Element[] => {
    const id = this.getId(property);
    const labeled = this.isLabeled(property);

    return (
      <tr key={property.id}>
        {labeled && (
          <th scope="row">
            <label htmlFor={id}>{property.name}</label>
          </th>
        )}
        <td colSpan={labeled ? 1 : 2}>{this.getInputSet(property, id)}</td>
      </tr>
    );
  };

  render() {
    return (
      <table
        className="properties-list"
        draggable={true}
        onDragStart={e => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <tbody>{this.props.properties.map(this.addProperty)}</tbody>
      </table>
    );
  }
}
