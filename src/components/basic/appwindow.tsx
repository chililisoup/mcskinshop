import React, { Component, ReactNode, RefObject } from 'react';

type AProps = {
  style?: React.CSSProperties;
  children: ReactNode;
};

type AState = {
  active: boolean;
};

export default class AppWindow extends Component<AProps, AState> {
  windowRef: RefObject<HTMLDivElement | null> = React.createRef();

  constructor(props: AProps) {
    super(props);

    this.state = {
      active: false
    };
  }

  componentDidMount() {
    if (this.windowRef.current)
      this.windowRef.current.addEventListener('mousedown', this.startFocus);

    document.addEventListener('mousedown', this.checkFocus);
  }

  componentWillUnmount() {
    if (this.windowRef.current)
      this.windowRef.current.removeEventListener('mousedown', this.startFocus);

    document.removeEventListener('mousedown', this.checkFocus);
  }

  checkFocus = (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;
    if (!this.windowRef.current?.contains(e.target)) this.setState({ active: false });
  };

  startFocus = () => {
    this.setState({ active: true });
    document.addEventListener('mousedown', this.checkFocus);
  };

  render() {
    return (
      <div
        ref={this.windowRef}
        className={'window' + (this.state.active ? ' active' : '')}
        style={this.props.style}
      >
        {this.props.children}
      </div>
    );
  }
}
