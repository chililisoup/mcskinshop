import React, { Component } from "react";

class DraggableWindow extends Component {
    constructor(props) {
        super(props);

        this.state = {
            pos: props.pos || { x: 6, y: 30 }
        }

        this.handleRef = React.createRef();
        this.windowRef = React.createRef();
    }

    componentDidMount() {
        this.handleRef.current.addEventListener("mousedown", this.onMouseDown);
        document.addEventListener("mouseup", this.onMouseUp);
        window.addEventListener("resize", this.handleWindowResize);

        this.handleWindowResize();
    }

    componentWillUnmount() {
        this.handleRef.current.removeEventListener("mousedown", this.mouseDown);
        document.removeEventListener("mouseup", this.onMouseUp);
        window.removeEventListener("resize", this.handleWindowResize);
    }

    onMouseDown = e => {
        if (e.button !== 0) return;
        this.handleOffset = {
            x: e.screenX - this.state.pos.x,
            y: e.screenY - this.state.pos.y
        }
        document.addEventListener("mousemove", this.drag);
    }

    onMouseUp = e => {
        if (e.button !== 0) return;
        this.handleOffset = null;
        document.removeEventListener("mousemove", this.drag);
    }

    handleWindowResize = () => {
        this.setState({ pos: this.fixPosition(this.state.pos) });
    }

    fixPosition = pos => {
        const width = this.windowRef.current.clientWidth;
        const height = this.windowRef.current.clientHeight;

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        return {
            x: Math.max(Math.min(pos.x, vw - width - 6), 6),
            y: Math.max(Math.min(pos.y, vh - height - 6), 38)
        };
    }

    drag = e => {
        this.setState({ pos: this.fixPosition({
            x: e.screenX - this.handleOffset.x,
            y: e.screenY - this.handleOffset.y
        })});
    }

    render() {
        return (
            <div ref={this.windowRef} className="draggable container" style={{ left: this.state.pos.x, top: this.state.pos.y }}>
                <span ref={this.handleRef}><p>{this.props.title}</p>{this.props.close && <button onClick={this.props.close}>X</button>}</span>
                <div>{this.props.children}</div>
            </div>
        );
    }
}

export default DraggableWindow;