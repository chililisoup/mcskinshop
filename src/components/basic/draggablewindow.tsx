import React, { Component, ReactNode, RefObject } from 'react';
import * as Util from '@tools/util';

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
  focused: boolean;
  fresh: boolean;
  active: boolean;
};

export default class DraggableWindow extends Component<AProps, AState> {
  handleRef: RefObject<HTMLSpanElement | null> = React.createRef();
  windowRef: RefObject<HTMLDivElement | null> = React.createRef();
  resizeObserver;
  handleOffset = { x: 0, y: 0 };
  anchorOffset = { x: 0, y: 0 };
  relativeViewport = { width: 0, height: 0 };

  constructor(props: AProps) {
    super(props);

    this.state = {
      pos: props.startPos ?? { x: 0, y: 0 },
      anchor: props.anchor ?? { vw: 0, vh: 0 },
      focused: false,
      fresh: true,
      active: false
    };

    this.resizeObserver = new ResizeObserver(this.handleWindowRefResize);
  }

  componentDidMount() {
    if (this.handleRef.current)
      this.handleRef.current.addEventListener('mousedown', this.onMouseDown);
    if (this.windowRef.current) {
      document.addEventListener('mousedown', this.checkFocus);
      this.windowRef.current.addEventListener('mousedown', this.startFocus);
      this.resizeObserver.observe(this.windowRef.current);
    }

    document.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('resize', this.handleWindowResize);

    this.handleWindowResize();
  }

  componentWillUnmount() {
    if (this.handleRef.current)
      this.handleRef.current.removeEventListener('mousedown', this.onMouseDown);
    if (this.windowRef.current)
      this.windowRef.current.removeEventListener('mousedown', this.startFocus);

    this.resizeObserver.disconnect();

    window.removeEventListener('resize', this.handleWindowResize);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousedown', this.checkFocus);
    document.removeEventListener('mousemove', this.drag);
  }

  checkFocus = (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;

    const ref = this.windowRef.current;
    if (!ref?.contains(e.target) && e.target.closest('.draggable')) {
      this.setState({ focused: false, fresh: false, active: false });
      document.removeEventListener('mousedown', this.checkFocus);
    } else if (!ref?.contains(e.target)) this.setState({ active: false });
  };

  startFocus = () => {
    this.setState({ focused: true, fresh: false, active: true });
    document.addEventListener('mousedown', this.checkFocus);
  };

  onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;

    this.handleOffset = {
      x: e.screenX + this.anchorOffset.x - this.state.pos.x,
      y: e.screenY + this.anchorOffset.y - this.state.pos.y
    };

    document.addEventListener('mousemove', this.drag);
  };

  onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    document.removeEventListener('mousemove', this.drag);
  };

  recalculateRelatives = () => {
    const ref = this.windowRef.current ?? { clientWidth: 0, clientHeight: 0 };
    this.relativeViewport = {
      width: window.innerWidth - ref.clientWidth,
      height: window.innerHeight - ref.clientHeight
    };

    this.anchorOffset = {
      x: this.state.anchor.vw * this.relativeViewport.width,
      y: this.state.anchor.vh * this.relativeViewport.height
    };
  };

  handleWindowRefResize = () => {
    const oldPos = {
      x: this.state.pos.x + this.anchorOffset.x,
      y: this.state.pos.y + this.anchorOffset.y
    };

    this.recalculateRelatives();

    const newPos = {
      x: oldPos.x - this.anchorOffset.x,
      y: oldPos.y - this.anchorOffset.y
    };

    this.setState({ pos: this.fixPosition(newPos) });
  };

  handleWindowResize = () => {
    this.recalculateRelatives();
    this.setState({ pos: this.fixPosition(this.state.pos) });
  };

  fixPosition = (pos: AState['pos']) => {
    return {
      x:
        Util.clamp(pos.x + this.anchorOffset.x, 6, this.relativeViewport.width - 6) -
        this.anchorOffset.x,
      y:
        Util.clamp(pos.y + this.anchorOffset.y, 38, this.relativeViewport.height - 6) -
        this.anchorOffset.y
    };
  };

  drag = (e: MouseEvent) => {
    this.setState({
      pos: this.fixPosition({
        x: e.screenX + this.anchorOffset.x - this.handleOffset.x,
        y: e.screenY + this.anchorOffset.y - this.handleOffset.y
      })
    });
  };

  render() {
    return (
      <div
        ref={this.windowRef}
        className={
          'draggable container' +
          (this.state.focused ? ' focused' : '') +
          (this.state.fresh ? ' fresh' : '') +
          (this.state.active ? ' active' : '')
        }
        style={{
          left: this.state.pos.x + this.anchorOffset.x,
          top: this.state.pos.y + this.anchorOffset.y
        }}
      >
        <span ref={this.handleRef}>
          <p>{this.props.title}</p>
          {this.props.close && <button onClick={this.props.close}>X</button>}
        </span>
        <hr />
        <div>{this.props.children}</div>
      </div>
    );
  }
}
