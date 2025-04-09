import React, { Component } from "react";
import * as ImgMod from "../../tools/imgmod";
import DraggableWindow from "../basic/draggablewindow";

class Preview extends Component {
    constructor(props) {
        super(props);

        this.state = {
            size: 4
        }
    }

    updateSize = size => this.setState({size: size});

    render() {
        return (
            <DraggableWindow title="Preview" pos={{x: 100000, y: 100000}} close={this.props.close} children={
                <div className="Preview">
                    <span>
                        <button onClick={() => this.updateSize(Math.max(this.state.size - 1, 1))}>-</button>
                        <button onClick={() => this.updateSize(Math.min(this.state.size + 1, 16))}>+</button>
                    </span>
                    <img
                        src={this.props.skin || ImgMod.emptyImageSource}
                        alt="Flattened Skin"
                        style={{
                            width: this.state.size * 64 + "px",
                            height: this.state.size * 64 + "px",
                            backgroundSize: this.state.size * 16 + "px"
                        }}
                    />
                </div>
            } />
        );
    }
}

export default Preview;