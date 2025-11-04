import React, { Component } from 'react';

type AProps = {
  close?: () => void;
  children: React.ReactNode;
};

type AState = {
  open: boolean;
};

export default class PopUp extends Component<AProps, AState> {
  wrapperRef: React.RefObject<HTMLDivElement | null> = React.createRef();
  first = false;

  constructor(props: AProps) {
    super(props);

    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

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
