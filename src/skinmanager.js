import React, { Component } from 'react';
import * as ImgMod from './imgmod';
import PaperDoll from './paperdoll'
import LayerManager from './layermanager';
import LayerAdder from './layeradder';
import AssetCreator from './assetcreator';
import MenuBar from './menubar';

class SkinManager extends Component {
    constructor(props) {
        super(props);

        this.state = {
            skin: null,
            slim: false
        }
        this.layers = new ImgMod.Layer();
    }

    updateSlim = slim => this.setState({ slim: slim });

    updateSkin = () => {
        if (this.layers.sublayers.length)
            this.layers.render().then(() => this.setState({skin: this.layers.src}));
        else this.setState({ skin: null });
    }

    updateLayers = newLayers => {
        this.layers = newLayers;
        this.updateSkin();
    }

    addLayer = layer => {
        this.layers.sublayers.push(layer);
        this.updateSkin();
    }

    downloadSkin = () => {
        const link = document.createElement("a");
        link.href = this.state.skin;
        const name = window.prompt("Download as...", "My Skin");
        if (name === null) return;
        link.download = name + ".png";
        link.click();
    }

    render() {
        return ( //Make it so layer manager just sends updated layers instead of layer update commands
            <div className="SkinManager">
                <MenuBar addLayer={this.addLayer} downloadSkin={this.downloadSkin} updateSlim={this.updateSlim} />
                <LayerManager layers={this.layers} updateLayers={this.updateLayers} />
                <div>
                    <PaperDoll skin={this.state.skin} slim={this.state.slim} updateSlim={this.updateSlim} />
                    <div className="Preview container">
                        <p>Preview</p>
                        <img src={this.state.skin || ImgMod.emptyImageSource} alt="Flattened Skin" />
                    </div>
                </div>
                <AssetCreator addLayer={this.addLayer} />
                <LayerAdder addLayer={this.addLayer} />
            </div>
        );
    }
}

export default SkinManager;