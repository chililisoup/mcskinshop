import React, { Component } from 'react';
import PopUp from './popup';
import * as ImgMod from './imgmod';

class MenuBar extends Component {
    constructor(props) {
        super(props);

        this.state = {
            file: false,
            edit: false,
            view: false,
            help: false
        };

        this.uploadRef = React.createRef();
    }

    addLayerFromInput = e => {
        const image = new ImgMod.Img();
        image.name = e.target.files[0].name;
        image.id = Math.random().toString(16).slice(2);
        
        image.render(URL.createObjectURL(e.target.files[0]))
        .then(() => {
            e.target.value = "";
            this.props.addLayer(image);
            this.props.updateSlim(image.detectSlimModel());
        });

        this.setState({file: false});
    }

    addLayerFromUsername = () => {
        /* This might be better but CORS makes it annoying

        fetch("https://api.mojang.com/users/profiles/minecraft/" + username)
        .then(response => response.json())
        .then(data => fetch("https://sessionserver.mojang.com/session/minecraft/profile/" + data.id))
        .then(response => response.json())
        .then(data => {
            const skin = new ImgMod.Img();
            this.layers.sublayers.push(skin);
            skin.render(JSON.parse(atob(data.properties[0].value)).textures.SKIN.url).then(() => {
                this.updateSkin();
            });
        });
        */

        const username = prompt("Enter username:").replace(/[^0-9A-Za-z_]/g, "");

        const image = new ImgMod.Img();
        image.name = username;
        image.id = Math.random().toString(16).slice(2);
        
        image.render("https://minotar.net/skin/" + username).then(() => {
            this.props.addLayer(image);
            this.props.updateSlim(image.detectSlimModel());
        });

        this.setState({file: false});
    }

    downloadSkin = () => {
        this.props.downloadSkin();
        this.setState({file: false});
    }

    render() {
        return (
            <div className="MenuBar">
                <button style={this.state.file ? {background: 'rgb(66, 54, 99)'} : {}} onMouseDown={() => this.setState({file: !this.state.file})}>File</button>
                {this.state.file && <PopUp close={() => this.setState({file: false})} children={
                    <div>
                        <button onClick={() => this.uploadRef.current.click()}>Load from File...</button>
                        <input ref={this.uploadRef} type="file" accept="image/png" onChange={this.addLayerFromInput} />
                        <button onClick={this.addLayerFromUsername}>Load from Username...</button>
                        <hr/>
                        <button onClick={this.downloadSkin}>Save As...</button>
                    </div>
                } />}
                <button style={this.state.edit ? {background: 'rgb(66, 54, 99)'} : {}} onMouseDown={() => this.setState({edit: !this.state.edit})}>Edit</button>
                {this.state.edit && <PopUp close={() => this.setState({edit: false})} children={
                    <div style={{marginLeft: '46px'}}>
                        <button onClick={this.props.requestUndo}>{this.props.editHints[0] === "" ? "Nothing to undo" : "Undo " + this.props.editHints[0]}</button>
                        <button onClick={this.props.requestRedo}>{this.props.editHints[1] === "" ? "Nothing to redo" : "Redo " + this.props.editHints[1]}</button>
                    </div>
                } />}
                <button style={this.state.view ? {background: 'rgb(66, 54, 99)'} : {}} onMouseDown={() => this.setState({view: !this.state.view})}>View</button>
                {this.state.view && <PopUp close={() => this.setState({view: false})} children={
                    <div style={{marginLeft: '94px'}}>
                        <button>Look at that view...</button>
                    </div>
                } />}
                <button style={this.state.help ? {background: 'rgb(66, 54, 99)'} : {}} onMouseDown={() => this.setState({help: !this.state.help})}>Help</button>
                {this.state.help && <PopUp close={() => this.setState({help: false})} children={
                    <div style={{marginLeft: '148px'}}>
                        <button>Stop it. Get some help.</button>
                    </div>
                } />}
            </div>
        );
    }
}

export default MenuBar;