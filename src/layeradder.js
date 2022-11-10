import React, { Component } from 'react';
import * as ImgMod from './imgmod';
import fakedatabase from './fakedatabase.json';

class LayerAdder extends Component {
    constructor(props) {
        super(props);

        this.state = {
            layers: new ImgMod.Layer()
        }
    }

    componentDidMount() {
        this.loadAssets();
    }

    addLayer = id => {
        const layer = new ImgMod.Layer();
        layer.name = fakedatabase[id].name;
        layer.colors = fakedatabase[id].colors;
        layer.advanced = fakedatabase[id].advanced;
        layer.id = Math.random().toString(16).slice(2);

        Promise.all(fakedatabase[id].layers.map((src, i) => {
            const image = new ImgMod.Img();
            layer.sublayers.push(image);
            if (fakedatabase[id].colors[i] === "null") image.type = "null";
            if (fakedatabase[id].colors[i] === "erase") image.type = "erase";
            if (fakedatabase[id].colors[i] === "flatten") image.type = "flatten";
            return image.render(process.env.PUBLIC_URL + fakedatabase[id].loc + src);
        })).then(() => this.props.addLayer(layer));
    }

    loadAssets = () => {
        const layers = new ImgMod.Layer();

        Promise.all(fakedatabase.map(async asset => {
            const sublayer = new ImgMod.Layer();
            layers.sublayers.push(sublayer);

            await Promise.all(asset.layers.map(src => {
                const image = new ImgMod.Img();
                sublayer.sublayers.push(image);
                return image.render(process.env.PUBLIC_URL + asset.loc + src);
            }));
            return sublayer.render();
        })).then(() => this.setState({layers: layers}))
    }

    render() {
        let elem = <div />
        if (this.state.layers.sublayers.length) {
            elem = this.state.layers.sublayers.map((sublayer, i) => {
                return (
                    <div className="container" key={fakedatabase[i].name}>
                        <p>{fakedatabase[i].name}</p>
                        <span>
                            <img src={sublayer.src} alt={fakedatabase[i].name} title={fakedatabase[i].name} />
                            <button onClick={this.addLayer.bind(this, i)}>+</button>
                        </span>
                    </div>
                );
            })
        }

        return (
            <div className="layer-adder">
                {elem}
            </div>
        );
    }
}

export default LayerAdder;