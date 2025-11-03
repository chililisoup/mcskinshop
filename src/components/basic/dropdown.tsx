import React, { Component, ReactNode } from 'react';

type AProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

type AState = {
  open: boolean;
};

export default class Dropdown extends Component<AProps, AState> {
  constructor(props: AProps) {
    super(props);

    this.state = {
      open: this.props.defaultOpen ?? false
    };
  }

  render() {
    return (
      <div className="dropdown container">
        <span onClick={() => this.setState({ open: !this.state.open })} className="dropdown-bar">
          <p>{this.props.title}</p>
          <span>
            <button>{this.state.open ? '/\\' : '\\/'}</button>
          </span>
        </span>
        {this.state.open && (
          <div>
            <hr />
            {this.props.children}
            <hr />
          </div>
        )}
      </div>
    );
  }
}
