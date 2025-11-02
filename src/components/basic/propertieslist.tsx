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
  onChange?: (value: number) => void;
};

type BoolProperty = BaseProperty & {
  type: 'checkbox';
  value: boolean;
  onChange?: (value: boolean) => void;
};

type SelectProperty = BaseProperty & {
  type: 'select';
  value?: string;
  options: readonly ([value: string, name?: string] | string)[] | Record<string, string>;
  onChange?: (value: string) => void;
};

type ButtonProperty = BaseProperty & {
  type: 'button';
  selected?: boolean;
  label?: string | React.JSX.Element;
  onClick?: () => void;
};

type FileProperty = BaseProperty & {
  type: 'file';
  label?: string;
  accept?: string;
  onUpload?: (value: File, name: string) => void;
};

type ColorProperty = BaseProperty & {
  type: 'color';
  value: string;
  alpha?: boolean;
  controlled?: boolean;
  onChange?: (value: string) => void;
};

type SectionProperty = BaseProperty & {
  type: 'section';
  properties: Property[];
};

type DividerProperty = { id: string; type: 'divider'; siblings?: Property[] };

export type Property =
  | RangeProperty
  | BoolProperty
  | SelectProperty
  | ButtonProperty
  | FileProperty
  | ColorProperty
  | SectionProperty
  | DividerProperty;

type AProps = {
  numberFallback?: (id: string, value: number, finished: boolean) => void;
  booleanFallback?: (id: string, value: boolean) => void;
  stringFallback?: (id: string, value: string, finished: boolean) => void;
  buttonFallback?: (id: string) => void;
  fileFallback?: (id: string, value: File, name: string) => void;
  type?: 'list' | 'ribbon' | 'toolbar';
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
            callback={
              property.onChange ??
              ((value, finished) => this.props.numberFallback?.(property.id, value, finished))
            }
            id={id}
            key={property.id}
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
          this.props.type === 'ribbon' ? (
            <input
              id={id}
              key={property.id}
              type="checkbox"
              checked={property.value}
              disabled={property.disabled}
              onChange={e =>
                property.onChange
                  ? property.onChange(e.target.checked)
                  : this.props.booleanFallback?.(property.id, e.target.checked)
              }
            />
          ) : (
            <span key={property.id}>
              <input
                id={id}
                type="checkbox"
                checked={property.value}
                disabled={property.disabled}
                onChange={e =>
                  property.onChange
                    ? property.onChange(e.target.checked)
                    : this.props.booleanFallback?.(property.id, e.target.checked)
                }
              />
            </span>
          )
        ];

      case 'select':
        return [
          <select
            id={id}
            key={property.id}
            value={property.value}
            disabled={property.disabled}
            onChange={e =>
              property.onChange
                ? property.onChange(e.target.value)
                : this.props.stringFallback?.(property.id, e.target.value, true)
            }
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
            key={property.id}
            disabled={property.disabled}
            onClick={property.onClick ?? (() => this.props.buttonFallback?.(property.id))}
            className={property.selected ? 'selected' : ''}
            title={property.name}
          >
            {property.label ?? property.name}
          </button>
        ];
      case 'file':
        return [
          <FileInput
            id={id}
            key={property.id}
            accept={property.accept}
            disabled={property.disabled}
            callback={
              property.onUpload ??
              ((value, name) => this.props.fileFallback?.(property.id, value, name))
            }
          >
            {property.label ?? property.name}
          </FileInput>
        ];
      case 'color':
        return [
          <ColorPicker
            id={id}
            key={property.id}
            disabled={property.disabled}
            default={property.value}
            alpha={property.alpha}
            controlled={property.controlled}
            update={
              property.onChange ??
              ((value, finished) => this.props.stringFallback?.(property.id, value, finished))
            }
          />
        ];
      case 'section':
        return property.disabled
          ? []
          : [
              <Dropdown title={property.name} key={property.id}>
                <PropertiesList
                  numberFallback={this.props.numberFallback}
                  booleanFallback={this.props.booleanFallback}
                  stringFallback={this.props.stringFallback}
                  buttonFallback={this.props.buttonFallback}
                  fileFallback={this.props.fileFallback}
                  properties={property.properties}
                />
                <hr />
              </Dropdown>
            ];
      case 'divider':
        return [<hr key={property.id} />];
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

  isLabeled = (
    property: Property
  ): property is Exclude<Property, { type: 'divider' }> & boolean => {
    return (
      property.type !== 'divider' &&
      !property.unlabeled &&
      property.type !== 'section' &&
      ((property.type !== 'button' && property.type !== 'file') ||
        typeof property.label === 'string')
    );
  };

  addProperty = (property: Property): React.JSX.Element | React.JSX.Element[] => {
    const id = this.getId(property);
    const labeled = this.isLabeled(property);
    const input = this.getInputSet(property, id);

    switch (this.props.type) {
      case 'ribbon':
      case 'toolbar':
        return labeled ? (
          <span key={`${property.id}-span`}>
            <label htmlFor={id}>{property.name}</label>
            {input}
          </span>
        ) : (
          input
        );
      default:
        return (
          <tr key={`${property.id}-row`}>
            {labeled && (
              <th scope="row">
                <label htmlFor={id}>{property.name}</label>
              </th>
            )}
            <td colSpan={labeled ? 1 : 2}>{input}</td>
          </tr>
        );
    }
  };

  render() {
    const properties = this.props.properties.map(this.addProperty);

    switch (this.props.type) {
      case 'ribbon':
        return <span className="settings-ribbon">{properties}</span>;
      case 'toolbar':
        return <div className="toolbar">{properties}</div>;
      default:
        return (
          <table
            className="properties-list"
            draggable={true}
            onDragStart={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <tbody>{properties}</tbody>
          </table>
        );
    }
  }
}
