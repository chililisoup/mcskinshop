import React, { Component } from "react";
import no from "./assets/no.png";

class GridSelect extends Component {
    constructor(props) {
        super(props);

        this.state = {
            selected: this.props.default || false,
            width: 1
        }

        this.emptyOption = this.props.emptyOption || false;
        this.gridRef = React.createRef();
    }

    componentDidMount() {
        window.addEventListener("resize", this.handleWindowResize);

        this.handleWindowResize();
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.handleWindowResize);
    }

    handleWindowResize = () => {
        const width = this.gridRef.current.clientWidth;
        const columns = Math.max(1, Math.round(width / this.props.targetWidth));

        this.setState({width: width / columns});
    }

    select = option => {
        this.props.select(option);
        this.setState({selected: option});
    }

    addNoneOption = () => {
        return (
            <div
                style={{
                    width: this.state.width - 6
                }}
                onClick={() => this.select(false)}
                className={!this.state.selected ? "highlighted" : ""}
            >
                <img
                    alt="None"
                    src={no}
                />
            </div>
        );
    }

    addOption = option => {
        return (
            <img
                style={{
                    width: this.state.width - 6
                }}
                onClick={() => this.select(option[1])}
                className={this.state.selected === option[1] ? "highlighted" : ""}
                alt={option[0]}
                src={option[1]}
            />
        );
    }

    render() {
        return (
            <div className="grid-select" ref={this.gridRef}>
                { this.emptyOption && this.addNoneOption() }
                { this.props.options.map(this.addOption) }
            </div>
        );
    }
}

export default GridSelect;