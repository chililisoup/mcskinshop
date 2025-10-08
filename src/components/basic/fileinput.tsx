import React, { ChangeEvent, Component, ReactNode, RefObject } from 'react';

type AProps = {
  callback?: (file: File, name: string) => void;
  id?: string;
  accept?: string;
  disabled?: boolean;
  children: ReactNode;
};

export default class FileInput extends Component<AProps> {
  uploadRef: RefObject<HTMLInputElement | null> = React.createRef();

  onFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    this.props.callback?.(e.target.files[0], e.target.files[0].name.replace(/\.[^/.]+$/, ''));
    e.target.value = '';
  };

  render() {
    return (
      <button
        id={this.props.id}
        disabled={this.props.disabled}
        onClick={() => this.uploadRef.current?.click()}
      >
        {this.props.children}
        <input
          type="file"
          className="hidden"
          ref={this.uploadRef}
          accept={this.props.accept}
          onChange={this.onFileUpload}
        />
      </button>
    );
  }
}
