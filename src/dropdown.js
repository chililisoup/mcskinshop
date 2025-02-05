import React, { Component } from "react";

class Dropdown extends Component {
    constructor(props) {
        super(props);

        this.state = {
            open: this.props.defaultOpen || false
        }
    }

    render() {
        return (
            <div className="dropdown container">
                <span onClick={() => this.setState({open: !this.state.open})} className="dropdown-bar">
                    <p>{this.props.title}</p>
                    <span>
                        <button>{this.state.open ? "/\\" : "\\/"}</button>
                    </span>
                </span>
                {this.state.open && <div>
                    <hr />
                    {this.props.children}
                </div>}
            </div>
        );
    }
}

export default Dropdown;