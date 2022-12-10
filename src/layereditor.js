import React, { Component } from 'react';
import ColorPicker from './colorpicker';

class LayerEditor extends Component {
    constructor(props) {
        super(props);

        this.layer = props.selectedLayer;
        this.canvasRef = React.createRef();
        this.mouseActive = false;
        this.color = "#000000";
        this.mousePos = {x: 0, y: 0};
        this.lastUpdate = new Date();
    }

    componentDidUpdate() {
        const ctx = this.canvasRef.current.getContext("2d");

        if (!this.props.layer) {
            this.layer = null;
            ctx.clearRect(0, 0, 64, 64);
            return;
        }
        
        if (this.layer && this.props.layer.id == this.layer.id) return;
        
        this.layer = this.props.layer;
        if (this.layer) {
            ctx.clearRect(0, 0, 64, 64);
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

    onMouseQuit = () => {
        this.mouseActive = false;
        this.update(true);
    }

    update = force => {
        if (new Date().getTime() - this.lastUpdate.getTime() < 100 && !force) return;
        if (!this.layer) return;

        this.lastUpdate = new Date();
        this.layer.rawSrc = this.canvasRef.current.toDataURL();
        this.layer.render().then(() => {this.props.updateLayer(this.layer)});
    }

    drawPixel = () => {
        if (!this.layer) return;

        const ctx = this.canvasRef.current.getContext("2d");
        ctx.fillStyle = this.color;

        if (this.mouseActive === "erase") {
            ctx.clearRect(this.mousePos.x, this.mousePos.y, 1, 1);
        } else ctx.fillRect(this.mousePos.x, this.mousePos.y, 1, 1);

        this.update();
    }

    render() {
        return (
            <div className="container">
                <ColorPicker update={this.setColor} alpha={true} />
                <canvas
                    className="layereditor-canvas"
                    ref={this.canvasRef}
                    onMouseMove={this.onMouseMove}
                    onMouseDown={this.onMouseDown}
                    onMouseUp={this.onMouseQuit}
                    onMouseLeave={this.onMouseQuit}
                    onContextMenu={e => e.preventDefault()}
                    width={64}
                    height={64}
                />
            </div>
        );
    }
}

export default LayerEditor;