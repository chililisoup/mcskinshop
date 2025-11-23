import React, { Component, ReactNode, RefObject } from 'react';

type AProps = {
  close?: () => void;
  children: ReactNode;
};

export default class PopUp extends Component<AProps> {
  wrapperRef: RefObject<HTMLDivElement | null> = React.createRef();
  first = false;

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleClickOutside = (e: MouseEvent) => {
    if (!this.first) {
      this.first = true;
      return;
    }
    if (
      e.target &&
      e.target instanceof Element &&
      this.props.close &&
      this.wrapperRef.current &&
      !this.wrapperRef.current.contains(e.target)
    ) {
      this.props.close();
    }
  };

  render() {
    return (
      <div ref={this.wrapperRef} className="popup">
        {this.props.children}
      </div>
    );
  }
}
