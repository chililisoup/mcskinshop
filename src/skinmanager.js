import React, { Component } from 'react';
import * as ImgMod from './imgmod';
import PaperDoll from './paperdoll'
import LayerManager from './layermanager';
import LayerAdder from './layeradder';
import AssetCreator from './assetcreator';
import MenuBar from './menubar';
import DraggableWindow from './draggablewindow';

class SkinManager extends Component {
    constructor(props) {
        super(props);

        this.state = {
            skin: null,
            slim: false,
            editHints: ["", ""],
            layerManager: true,
            paperDoll: true,
            preview: true,
            assetCreator: false,
            layerAdder: false
        }
        this.layers = new ImgMod.Layer();
        this.editHistory = [];
        this.redoProphecy = [];
    }

    componentDidMount() {
        document.addEventListener("keydown", this.onKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.onKeyDown);
    }

    onKeyDown = e => {
        if (!e.ctrlKey) return;

        if (document.hasFocus()
            && document.activeElement
            && document.activeElement.nodeName === "INPUT"
        ) return;

        if (e.key === "z")
            this.requestUndo();
        else if (e.key === "Z" || e.key === "y")
            this.requestRedo();
    }

    requestUndo = () => {
        if (this.editHistory.length < 1) return;

        const action = this.editHistory.pop();
        this.redoProphecy.push([action[0], action[1]()]);

        this.setState({
            editHints: [
                this.editHistory.length > 0 ? this.editHistory[this.editHistory.length - 1][0] : "",
                action[0]
            ]
        });
    }

    requestRedo = () => {
        if (this.redoProphecy.length < 1) return;

        const action = this.redoProphecy.pop();
        this.editHistory.push([action[0], action[1]()]);

        this.setState({
            editHints: [
                action[0],
                this.redoProphecy.length > 0 ? this.redoProphecy[this.redoProphecy.length - 1][0] : ""
            ]
        });
    }

    addEdit = (name, undoCallback) => {
        this.editHistory.push([name, undoCallback]);

        if (this.editHistory.length > 50) this.editHistory.shift();

        this.redoProphecy = [];
        this.setState({editHints: [name, ""]});
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

    updateState = (setting, value) => {
        const update = {};
        update[setting] = value;
        this.setState(update);
    }

    render() {
        return ( //Make it so layer manager just sends updated layers instead of layer update commands
            <div className="appRoot">
                <MenuBar
                    addLayer={this.addLayer}
                    downloadSkin={this.downloadSkin}
                    updateSlim={this.updateSlim}
                    requestUndo={this.requestUndo}
                    requestRedo={this.requestRedo}
                    editHints={this.state.editHints}
                    viewTab={[
                        ["Layer Manager", this.state.layerManager, () => this.updateState("layerManager", !this.state.layerManager)],
                        ["Paper Doll", this.state.paperDoll, () => this.updateState("paperDoll", !this.state.paperDoll)],
                        ["Preview", this.state.preview, () => this.updateState("preview", !this.state.preview)],
                        ["Asset Creator", this.state.assetCreator, () => this.updateState("assetCreator", !this.state.assetCreator)],
                        ["Layer Adder", this.state.layerAdder, () => this.updateState("layerAdder", !this.state.layerAdder)],
                    ]}
                />
                <div className="SkinManager">
                    
                    {this.state.layerManager && <LayerManager layers={this.layers} updateLayers={this.updateLayers} />}
                    {this.state.paperDoll && <PaperDoll skin={this.state.skin} slim={this.state.slim} updateSlim={this.updateSlim} addEdit={this.addEdit} />}
                    {this.state.preview && <DraggableWindow title="Preview" pos={{x: 100000, y: 100000}} close={() => this.updateState("preview", false)} children={
                        <img className="Preview" src={this.state.skin || ImgMod.emptyImageSource} alt="Flattened Skin" />
                    } />}
                    {this.state.assetCreator && <AssetCreator addLayer={this.addLayer} />}
                    {this.state.layerAdder && <LayerAdder addLayer={this.addLayer} />}
                </div>
            </div>
        );
    }
}

export default SkinManager;