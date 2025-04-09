import React, { Component } from "react";

class PopUp extends Component {
    constructor(props) {
        super(props);

        this.wrapperRef = React.createRef();
        this.first = false;
        this.handleClickOutside = this.handleClickOutside.bind(this);
    }

    componentDidMount() {
        document.addEventListener("mousedown", this.handleClickOutside);
    }

    componentWillUnmount() {
        document.removeEventListener("mousedown", this.handleClickOutside);
    }

    handleClickOutside = e => {
        if (!this.first) {
            this.first = true;
            return;
        }
        if (this.props.close && this.wrapperRef && !this.wrapperRef.current.contains(e.target)) {
            this.props.close();
        }
    }

    render() {
        return (
            <div ref={this.wrapperRef}>
                {this.props.children}
            </div>
        );
    }
}

export default PopUp;