import React, { Component } from 'react';

class LayerEditor extends Component {
    constructor(props) {
        super(props);

        this.layer = props.selectedLayer;
        this.canvasRef = React.createRef();
        this.mouseActive = false;
        this.color = "#000000";
        this.mousePos = {x: 0, y: 0};
    }

    componentDidUpdate() {
        const ctx = this.canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, 64, 64);
        this.layer = this.props.layer;
        if (this.layer) {
            ctx.drawImage(this.layer.image, 0, 0);
        }
    }

    setColor = color => this.color = color;

    onMouseMove = e => {
        const rect = this.canvasRef.current.getBoundingClientRect();
        this.mousePos = {
            x: Math.floor((e.clientX - rect.left) / (rect.right - rect.left) * this.canvasRef.current.width),
            y: Math.floor((e.clientY - rect.top) / (rect.bottom - rect.top) * this.canvasRef.current.height)
        };
        if (this.mouseActive) this.drawPixel();
    }

    onMouseDown = e => {
        if (e.button !== 0 && e.button !== 2) return;

        this.mouseActive = true;
        if (e.button === 2) this.mouseActive = "erase";

        this.drawPixel();
    }

    drawPixel = () => {
        if (!this.layer) return;
        const ctx = this.canvasRef.current.getContext("2d");
        ctx.fillStyle = this.color;
        if (this.mouseActive === "erase") {
            ctx.clearRect(this.mousePos.x, this.mousePos.y, 1, 1);
        } else ctx.fillRect(this.mousePos.x, this.mousePos.y, 1, 1);

        this.layer.rawSrc = this.canvasRef.current.toDataURL();
        this.layer.render().then(() => {this.props.updateLayer(this.layer)});
    }

    render() {
        return (
            <div className="container">
                <input type="color" onChange={e => this.setColor(e.target.value)}/>
                <canvas
                    className="layereditor-canvas"
                    ref={this.canvasRef}
                    onMouseMove={this.onMouseMove}
                    onMouseDown={this.onMouseDown}
                    onMouseUp={() => this.mouseActive = false}
                    onMouseLeave={() => this.mouseActive = false}
                    onContextMenu={e => e.preventDefault()}
                    width={64}
                    height={64}
                />
            </div>
        );
    }
}

export default LayerEditor;