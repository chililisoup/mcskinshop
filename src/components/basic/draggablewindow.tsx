import React, { Component } from 'react';
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
  important?: boolean;
  close?: () => void;
  children: React.ReactNode;
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
  handleRef: React.RefObject<HTMLSpanElement | null> = React.createRef();
  windowRef: React.RefObject<HTMLDivElement | null> = React.createRef();
  resizeObserver;
  handleOffset = { x: 0, y: 0 };
  anchorOffset = { x: 0, y: 0 };
  relativeViewport = { width: 0, height: 0 };

  constructor(props: AProps) {
    super(props);

    this.state = {
      pos: props.startPos ?? { x: 0, y: 0 },
      anchor: props.anchor ?? (props.startPos ? { vw: 0, vh: 0 } : { vw: 0.5, vh: 0.5 }),
      focused: false,
      fresh: true,
      active: !!props.important
    };

    this.resizeObserver = new ResizeObserver(this.handleWindowRefResize);
  }

  componentDidMount() {
    if (this.handleRef.current) {
      this.handleRef.current.addEventListener('pointerdown', this.onPointerDown);
    }
    if (this.windowRef.current) {
      document.addEventListener('pointerdown', this.checkFocus);
      this.windowRef.current.addEventListener('pointerdown', this.startFocus);
      this.resizeObserver.observe(this.windowRef.current);
    }

    document.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('resize', this.handleWindowResize);

    this.handleWindowResize();
  }

  componentWillUnmount() {
    if (this.handleRef.current) {
      this.handleRef.current.removeEventListener('pointerdown', this.onPointerDown);
    }
    if (this.windowRef.current) {
      this.windowRef.current.removeEventListener('pointerdown', this.startFocus);
    }

    this.resizeObserver.disconnect();

    window.removeEventListener('resize', this.handleWindowResize);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointerdown', this.checkFocus);
    document.removeEventListener('pointermove', this.pointerDrag);
  }

  blinkImportant = () =>
    this.windowRef.current?.animate(
      [
        { outline: '4px solid var(--danger)' },
        { outline: '4px solid var(--danger)', offset: 0.49 },
        { outline: '2px solid var(--highlight)', offset: 0.5 }
      ],
      {
        duration: 250,
        iterations: 3
      }
    );

  checkFocus = (e: Event) => {
    if (!(e.target instanceof Element)) return;

    const ref = this.windowRef.current;
    if (this.props.important && !ref?.contains(e.target)) {
      this.blinkImportant();
      return;
    }

    if (!ref?.contains(e.target) && e.target.closest('.draggable')) {
      this.setState({ focused: false, fresh: false, active: false });
      document.removeEventListener('pointerdown', this.checkFocus);
    } else if (!ref?.contains(e.target)) this.setState({ active: false });
  };

  startFocus = () => {
    this.setState({ focused: true, fresh: false, active: true });
    document.addEventListener('pointerdown', this.checkFocus);
  };

  setHandleOffset = (x: number, y: number) => {
    this.handleOffset = {
      x: x + this.anchorOffset.x - this.state.pos.x,
      y: y + this.anchorOffset.y - this.state.pos.y
    };
  };

  onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.setHandleOffset(e.screenX, e.screenY);
    document.addEventListener('pointermove', this.pointerDrag);
  };

  onPointerUp = (e: PointerEvent) => {
    if (e.button !== 0) return;
    document.removeEventListener('pointermove', this.pointerDrag);
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

  drag = (x: number, y: number) => {
    this.setState({
      pos: this.fixPosition({
        x: x + this.anchorOffset.x - this.handleOffset.x,
        y: y + this.anchorOffset.y - this.handleOffset.y
      })
    });
  };

  pointerDrag = (e: PointerEvent) => this.drag(e.screenX, e.screenY);

  render() {
    const container = (
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
        <div>{this.props.children}</div>
        <hr />
        <span ref={this.handleRef}>
          <p>{this.props.title}</p>
          {this.props.close && (
            <button onClick={this.props.close} className="material-symbols-outlined">
              close
            </button>
          )}
        </span>
      </div>
    );

    return this.props.important ? <div className="important">{container}</div> : container;
  }
}
