import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import './main.css';
import PaperDoll from './paperdoll'
import LayerManager from './layermanager';
import * as ImgMod from './imgmod';

import fakedatabase from './fakedatabase.json';

const container = document.getElementById('root');
const root = createRoot(container);



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

    addLayer = (id) => {
        const layer = new ImgMod.Layer();
        layer.sublayers = fakedatabase[id].layers.map(
            (src, i) => {
                const sublayer = new ImgMod.Img(process.env.PUBLIC_URL + fakedatabase[id].loc + src);
                if (fakedatabase[id].colors[i] === "erase") sublayer.type = "erase";
                return sublayer;
            }
        );

        layer.colors = fakedatabase[id].colors;
        layer.advanced = fakedatabase[id].advanced;
        this.props.addLayer(layer);
    }

    loadAssets = () => {
        const layers = new ImgMod.Layer();

        fakedatabase.forEach(asset => {
            let sublayer = new ImgMod.Layer();
            asset.layers.forEach(src => sublayer.sublayers.push(
                new ImgMod.Img(process.env.PUBLIC_URL + asset.loc + src)
            ));
            layers.sublayers.push(sublayer);
        });

        layers.updateChildren().then(() => this.setState({layers: layers}));
    }

    render() {
        let elem = <div />
        if (this.state.layers.sublayers.length) {
            elem = this.state.layers.sublayers.map((sublayer, i) => {
                return (
                    <div className="container" key={fakedatabase[i].name}>
                        <img src={sublayer.src} alt={fakedatabase[i].name} title={fakedatabase[i].name} />
                        <button onClick={this.addLayer.bind(this, i)}>+</button>
                    </div>
                );
            })
        }

        return (
            <div>
                {elem}
            </div>
        );
    }
}

class SkinManager extends Component {
    constructor(props) {
        super(props);

        this.state = {
            skin: null
        }
        this.layers = new ImgMod.Layer();
    }

    componentDidMount() {
        this.updateSkin();//delete maybe? not needed atm
    }

    updateSkin = () => {
        if (this.layers.sublayers.length)
            this.layers.render().then(result => this.setState({ skin: result }));
        else this.setState({ skin: null })
    }

    updateLayers = (newLayers) => {
        this.layers = newLayers;
        this.updateSkin();
    }

    addLayer = (layer) => {
        this.layers.sublayers.push(layer);
        this.updateSkin();
    }

    addLayerFromInput = (e) => {
        this.layers.sublayers.push(new ImgMod.Img(URL.createObjectURL(e.target.files[0])));
        this.updateSkin();
    }

    render() {
        return ( //Make it so layer manager just sends updated layers instead of layer update commands
            <div className="SkinManager">
                <img src={this.state.skin} alt="" />
                <LayerManager layers={this.layers} updateLayers={this.updateLayers} />
                <input type="file" accept="image/png" onChange={this.addLayerFromInput} />
                <PaperDoll skin={this.state.skin} slim={false} />
                <LayerAdder addLayer={this.addLayer} />
            </div>
        );
    }
}

root.render(
    <React.StrictMode>
        <SkinManager />
    </React.StrictMode>
);