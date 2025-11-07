import React, { useId } from 'react';
import Slider, { SubType } from '@components/basic/slider';
import ColorPicker from '@components/basic/colorpicker';
import Dropdown from '@components/basic/dropdown';
import FileInput from '@components/basic/fileinput';
import NumberInput from '@components/basic/numberinput';

type BaseProperty = {
  name: string;
  id: string;
  disabled?: boolean;
  unlabeled?: boolean;
  siblings?: Property[];
};

type NumberProperty = BaseProperty & {
  type: 'number';
  value: number;
  resetValue?: number;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  enforceStep?: boolean;
  onChange?: (value: number) => void;
};

type RangeProperty = BaseProperty & {
  type: 'range';
  value: number;
  resetValue?: number;
  min?: number;
  max?: number;
  step?: number;
  snap?: number;
  allowExceed?: boolean;
  enforceStep?: boolean;
  subtype?: SubType;
  onChange?: (value: number) => void;
};

type BoolProperty = BaseProperty & {
  type: 'checkbox';
  value: boolean;
  onChange?: (value: boolean) => void;
};

type StringProperty = BaseProperty & {
  type: 'string';
  value: string;
  placeholder?: string;
  onChange?: (value: string) => void;
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
  onChange?: (value: string) => void;
} & (
    | {
        resetValue?: string;
        controlled: true;
      }
    | {
        resetValue?: undefined;
        controlled?: false;
      }
  );

type SectionProperty = BaseProperty & {
  type: 'section';
  properties: Property[];
  labelWidth?: string;
};

type DividerProperty = {
  id: string;
  type: 'divider';
  siblings?: Property[];
};

export type Property =
  | NumberProperty
  | RangeProperty
  | BoolProperty
  | StringProperty
  | SelectProperty
  | ButtonProperty
  | FileProperty
  | ColorProperty
  | SectionProperty
  | DividerProperty;

type ListType =
  | {
      type?: 'list';
      labelWidth?: string;
    }
  | {
      type: 'ribbon' | 'toolbar';
    };

type AProps = ListType & {
  numberFallback?: (id: string, value: number, finished: boolean) => void;
  booleanFallback?: (id: string, value: boolean) => void;
  stringFallback?: (id: string, value: string, finished: boolean) => void;
  buttonFallback?: (id: string) => void;
  fileFallback?: (id: string, value: File, name: string) => void;
  properties: Property[];
};

export default function PropertiesList(props: AProps) {
  const key = useId();

  const getId = (property: Property) => `${property.id}-${property.type}-${key}`;

  const isLabeled = (
    property: Property
  ): property is Exclude<Property, { type: 'divider' }> & boolean =>
    property.type !== 'divider' &&
    !property.unlabeled &&
    property.type !== 'section' &&
    ((property.type !== 'button' && property.type !== 'file') ||
      typeof property.label === 'string');

  const propertyElements = props.properties.map(addProperty);

  function getInput(property: Property, id: string) {
    switch (property.type) {
      case 'number': {
        const numberInput = (
          <NumberInput
            callback={
              property.onChange ??
              ((value, finished) => props.numberFallback?.(property.id, value, finished))
            }
            id={id}
            key={property.id}
            title={property.name}
            placeholder={property.placeholder}
            value={property.value}
            min={property.min}
            max={property.max}
            step={property.step}
            enforceStep={property.enforceStep}
            disabled={property.disabled}
          />
        );
        const resetValue = property.resetValue;
        return [
          resetValue ? (
            <span>
              {numberInput}
              {property.value !== resetValue && (
                <button
                  className="reset-button"
                  onClick={() => {
                    if (property.onChange) property.onChange(resetValue);
                    else props.numberFallback?.(property.id, resetValue, true);
                  }}
                >
                  &#8634;
                </button>
              )}
            </span>
          ) : (
            numberInput
          )
        ];
      }
      case 'range': {
        const slider = (
          <Slider
            callback={
              property.onChange ??
              ((value, finished) => props.numberFallback?.(property.id, value, finished))
            }
            id={id}
            key={property.id}
            title={property.name}
            value={property.value}
            min={property.min}
            max={property.max}
            step={property.step}
            snap={property.snap}
            allowExceed={property.allowExceed}
            enforceStep={property.enforceStep}
            subtype={property.subtype}
            disabled={property.disabled}
          />
        );
        const resetValue = property.resetValue;
        return [
          resetValue ? (
            <span>
              {slider}
              {property.value !== resetValue && (
                <button
                  className="reset-button"
                  onClick={() => {
                    if (property.onChange) property.onChange(resetValue);
                    else props.numberFallback?.(property.id, resetValue, true);
                  }}
                >
                  &#8634;
                </button>
              )}
            </span>
          ) : (
            slider
          )
        ];
      }
      case 'checkbox':
        return [
          props.type === 'ribbon' ? (
            <input
              id={id}
              key={property.id}
              title={property.name}
              type="checkbox"
              checked={property.value}
              disabled={property.disabled}
              onChange={e =>
                property.onChange
                  ? property.onChange(e.target.checked)
                  : props.booleanFallback?.(property.id, e.target.checked)
              }
            />
          ) : (
            <span key={property.id}>
              <input
                id={id}
                title={property.name}
                type="checkbox"
                checked={property.value}
                disabled={property.disabled}
                onChange={e =>
                  property.onChange
                    ? property.onChange(e.target.checked)
                    : props.booleanFallback?.(property.id, e.target.checked)
                }
              />
            </span>
          )
        ];
      case 'string':
        return [
          <input
            id={id}
            key={property.id}
            title={property.name}
            value={property.value}
            placeholder={property.placeholder}
            type="text"
            disabled={property.disabled}
            onChange={e =>
              property.onChange
                ? property.onChange(e.target.value)
                : props.stringFallback?.(property.id, e.target.value, true)
            }
          />
        ];
      case 'select':
        return [
          <select
            id={id}
            key={property.id}
            title={property.name}
            value={property.value}
            disabled={property.disabled}
            onChange={e =>
              property.onChange
                ? property.onChange(e.target.value)
                : props.stringFallback?.(property.id, e.target.value, true)
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
            title={property.name}
            disabled={property.disabled}
            onClick={property.onClick ?? (() => props.buttonFallback?.(property.id))}
            className={property.selected ? 'selected' : ''}
          >
            {property.label ?? property.name}
          </button>
        ];
      case 'file':
        return [
          <FileInput
            id={id}
            key={property.id}
            title={property.name}
            accept={property.accept}
            disabled={property.disabled}
            callback={
              property.onUpload ?? ((value, name) => props.fileFallback?.(property.id, value, name))
            }
          >
            {property.label ?? property.name}
          </FileInput>
        ];
      case 'color': {
        const picker = (
          <ColorPicker
            id={id}
            key={property.id}
            title={property.name}
            disabled={property.disabled}
            default={property.value}
            alpha={property.alpha}
            controlled={property.controlled}
            update={
              property.onChange ??
              ((value, finished) => props.stringFallback?.(property.id, value, finished))
            }
          />
        );
        const resetValue = property.resetValue;
        return [
          resetValue ? (
            <span>
              {picker}
              {property.value !== resetValue && (
                <button
                  className="reset-button"
                  onClick={() => {
                    if (property.onChange) property.onChange(resetValue);
                    else props.stringFallback?.(property.id, resetValue, true);
                  }}
                >
                  &#8634;
                </button>
              )}
            </span>
          ) : (
            picker
          )
        ];
      }
      case 'section':
        return property.disabled
          ? []
          : [
              <Dropdown title={property.name} key={property.id}>
                <PropertiesList
                  numberFallback={props.numberFallback}
                  booleanFallback={props.booleanFallback}
                  stringFallback={props.stringFallback}
                  buttonFallback={props.buttonFallback}
                  fileFallback={props.fileFallback}
                  properties={property.properties}
                  labelWidth={
                    property.labelWidth ??
                    (!props.type || props.type === 'list' ? props.labelWidth : undefined)
                  }
                />
              </Dropdown>
            ];
      case 'divider':
        return [<hr key={property.id} />];
    }
  }

  function getInputSet(property: Property, id: string) {
    const input = getInput(property, id);
    return property.siblings
      ? input.concat(
          ...property.siblings.map(sibling =>
            getInput(sibling, `${id}-${sibling.id}-${sibling.type}`)
          )
        )
      : input;
  }

  function addProperty(property: Property): React.JSX.Element | React.JSX.Element[] {
    const id = getId(property);
    const labeled = isLabeled(property);
    const input = getInputSet(property, id);
    if (input.length === 0) return [];

    switch (props.type) {
      case 'ribbon':
      case 'toolbar':
        return labeled ? (
          <span key={`${property.id}-span`}>
            <label htmlFor={id} title={property.name}>
              {property.name}
            </label>
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
                <label
                  htmlFor={id}
                  className={property.disabled ? 'disabled' : ''}
                  title={property.name}
                >
                  {property.name}
                </label>
              </th>
            )}
            <td colSpan={labeled ? 1 : 2}>{input.length > 1 ? <span className='siblings-holder'>{input}</span> : input}</td>
          </tr>
        );
    }
  }

  switch (props.type) {
    case 'ribbon':
      return <span className="settings-ribbon">{propertyElements}</span>;
    case 'toolbar':
      return <div className="toolbar">{propertyElements}</div>;
    default:
      return (
        <table
          className="properties-list"
          draggable={true}
          onDragStart={e => {
            e.stopPropagation();
            e.preventDefault();
          }}
          style={
            props.labelWidth ? ({ '--label-width': props.labelWidth } as React.CSSProperties) : {}
          }
        >
          <tbody>{propertyElements}</tbody>
        </table>
      );
  }
}
