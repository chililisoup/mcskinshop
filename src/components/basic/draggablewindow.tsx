import React, { Component, ReactNode, RefObject } from 'react';
import * as Util from '../../tools/util';

type AProps = {
  title: string;

  startPos?: {
    x: number;
    y: number;
  };

  anchor?: {
    vw: number;
    vh: number;
  };

  close?: () => void;

  children: ReactNode;
};

type AState = {
  pos: {
    x: number;
    y: number;
  };

  anchor: {
    vw: number;
    vh: number;
  };
};

class DraggableWindow extends Component<AProps, AState> {
  handleRef: RefObject<HTMLSpanElement | null> = React.createRef();
  windowRef: RefObject<HTMLDivElement | null> = React.createRef();
  handleOffset = { x: 0, y: 0 };

  constructor(props: AProps) {
    super(props);

    this.state = {
      pos: props.startPos ?? { x: 0, y: 0 },
      anchor: props.anchor ?? { vw: 0, vh: 0 }
    };
  }

  componentDidMount() {
    if (this.handleRef.current)
      this.handleRef.current.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('resize', this.handleWindowResize);

    this.handleWindowResize();
  }

  componentWillUnmount() {
    if (this.handleRef.current)
      this.handleRef.current.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('resize', this.handleWindowResize);
  }

  onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;

    const offset = this.anchorOffset();
    this.handleOffset = {
      x: e.screenX + offset.x - this.state.pos.x,
      y: e.screenY + offset.y - this.state.pos.y
    };

    document.addEventListener('mousemove', this.drag);
  };

  onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    document.removeEventListener('mousemove', this.drag);
  };

  handleWindowResize = () => {
    this.setState({ pos: this.fixPosition(this.state.pos) });
  };

  relativeViewport = () => {
    const ref = this.windowRef.current ?? { clientWidth: 0, clientHeight: 0 };
    const width = ref.clientWidth;
    const height = ref.clientHeight;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    return {
      width: vw - width,
      height: vh - height
    };
  };

  anchorOffset = () => {
    const viewport = this.relativeViewport();

    return {
      x: this.state.anchor.vw * viewport.width,
      y: this.state.anchor.vh * viewport.height
    };
  };

  fixPosition = (pos: AState['pos']) => {
    const offset = this.anchorOffset();
    const viewport = this.relativeViewport();

    return {
      x: Util.clamp(pos.x + offset.x, 6, viewport.width - 6),
      y: Util.clamp(pos.y + offset.y, 38, viewport.height - 6)
    };
  };

  drag = (e: MouseEvent) => {
    this.setState({
      pos: this.fixPosition({
        x: e.screenX - this.handleOffset.x,
        y: e.screenY - this.handleOffset.y
      })
    });
  };

  render() {
    return (
      <div
        ref={this.windowRef}
        className="draggable container"
        style={{ left: this.state.pos.x, top: this.state.pos.y }}
      >
        <span ref={this.handleRef}>
          <p>{this.props.title}</p>
          {this.props.close && <button onClick={this.props.close}>X</button>}
        </span>
        <div>{this.props.children}</div>
      </div>
    );
  }
}

export default DraggableWindow;
