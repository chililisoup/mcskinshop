import React, { Component } from 'react';
import * as ImgMod from '@tools/imgmod';
import DraggableWindow from '@components/basic/draggablewindow';

type AProps = {
  close: () => void;
  skin?: string;
};

type AState = {
  size: number;
};

export default class Preview extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    this.state = {
      size: 4
    };
  }

  updateSize = (size: number) => this.setState({ size: size });

  render() {
    return (
      <DraggableWindow title="Preview" anchor={{ vw: 1, vh: 1 }} close={this.props.close}>
        <div className="Preview">
          <span className="stretch">
            <button onClick={() => this.updateSize(Math.max(this.state.size - 1, 1))}>-</button>
            <button onClick={() => this.updateSize(Math.min(this.state.size + 1, 16))}>+</button>
          </span>
          <img
            src={this.props.skin ?? ImgMod.EMPTY_IMAGE_SOURCE}
            alt="Flattened Skin"
            style={{
              width: this.state.size * 64 + 'px',
              height: this.state.size * 64 + 'px',
              backgroundSize: this.state.size * 16 + 'px'
            }}
          />
        </div>
      </DraggableWindow>
    );
  }
}
