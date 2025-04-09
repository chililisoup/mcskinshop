import React, { Component } from "react";
import PopUp from "./popup";
import checker from "../../assets/checkerboard.png";

class ColorPicker extends Component {
    constructor(props) {
        super(props);

        let hsla = [0, 100, 50, 1];

        if (props.default && props.default[0] === "#") hsla = this.hexToHSL(props.default);

        this.state = {
            open: false,
            hsla: hsla,
            color: `hsla(${hsla[0]}, ${hsla[1]}%, ${hsla[2]}%, ${hsla[3]})`,
            hex: this.hexFromHSL(hsla[0], hsla[1], hsla[2]),
            bottom: false
        };

        this.boxStyle = {};
        this.pickerRef = React.createRef();
    }

    // https://gist.github.com/xenozauros/f6e185c8de2a04cdfecf
    hexToHSL = hex => {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

        if (!result) return false;
        
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;

        let max = Math.max(r, g, b)
        let min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) h = s = 0; // achromatic
        else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
                default: break;
            }
            h /= 6;
        }

        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100), 1];
    }

    // https://stackoverflow.com/a/44134328
    hexFromHSL = (h, s, l) => {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, "0"); // convert to Hex and prefix "0" if needed
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    setHSLA = (hsla, hex) => {
        const color = `hsla(${hsla[0]}, ${hsla[1]}%, ${hsla[2]}%, ${hsla[3]})`;
        this.setState({
            hsla: hsla, color: color,
            hex: hex ? hex : this.hexFromHSL(hsla[0], hsla[1], hsla[2])
        });
        if (this.props.update) this.props.update(color);
    }

    updateHue = hue => {
        const newHSLA = this.state.hsla;
        newHSLA[0] = hue;
        this.setHSLA(newHSLA);
    }

    updateSaturation = saturation => {
        const newHSLA = this.state.hsla;
        newHSLA[1] = saturation;
        this.setHSLA(newHSLA);
    }

    updateLightness = lightness => {
        const newHSLA = this.state.hsla;
        newHSLA[2] = lightness;
        this.setHSLA(newHSLA);
    }

    updateAlpha = alpha => {
        const newHSLA = this.state.hsla;
        newHSLA[3] = alpha;
        this.setHSLA(newHSLA);
    }

    setHex = hex => {
        const newHSLA = this.hexToHSL(hex);
        if (!newHSLA) return this.setState({hex: hex});
        this.setHSLA(newHSLA, hex);
    }

    togglePicker = () => {
        const rect = this.pickerRef.current.getBoundingClientRect();
        const height = window.innerHeight;

        this.setState({
            open: !this.state.open,
            bottom: rect.top > height / 2
        });
    }

    render() {
        return (
            <div className="color-picker-parent">
                <button ref={this.pickerRef} className="color-label" style={{
                        backgroundImage: `linear-gradient(to right,
                            hsla(${this.state.hsla[0]}, ${this.state.hsla[1]}%, ${this.state.hsla[2]}%, ${this.state.hsla[3]}),
                            hsl(${this.state.hsla[0]}, ${this.state.hsla[1]}%, ${this.state.hsla[2]}%)
                        ),
                        url(${checker})`
                    }}
                    onMouseDown={this.togglePicker}
                />
                {this.state.open && <PopUp close={() => this.setState({open: false})} children={
                    <div className={"color-picker " + (this.state.bottom ? "color-picker-bottom" : "color-picker-top")} style={this.state.open ? {display: "block"} : {display: "none"}}>
                        <div className="container">
                            <input value={this.state.hsla[0]} min={0} max={360} step={1} type="range" onChange={e => this.updateHue(e.target.value)} onMouseUp={e => this.updateHue(e.target.value)} style={{
                                background: `linear-gradient(to right,
                                    hsl(0, ${this.state.hsla[1]}%, ${this.state.hsla[2]}%),
                                    hsl(60, ${this.state.hsla[1]}%, ${this.state.hsla[2]}%),
                                    hsl(120, ${this.state.hsla[1]}%, ${this.state.hsla[2]}%),
                                    hsl(180, ${this.state.hsla[1]}%, ${this.state.hsla[2]}%),
                                    hsl(240, ${this.state.hsla[1]}%, ${this.state.hsla[2]}%),
                                    hsl(300, ${this.state.hsla[1]}%, ${this.state.hsla[2]}%),
                                    hsl(360, ${this.state.hsla[1]}%, ${this.state.hsla[2]}%)
                                )`
                            }} />
                            <input value={this.state.hsla[1]} min={0} max={100} step={1} type="range" onChange={e => this.updateSaturation(e.target.value)} onMouseUp={e => this.updateSaturation(e.target.value)} style={{
                                background: `linear-gradient(to right,
                                    hsl(
                                        ${this.state.hsla[0]},
                                        0%,
                                        ${this.state.hsla[2]}%
                                    ),
                                    hsl(
                                        ${this.state.hsla[0]},
                                        100%,
                                        ${this.state.hsla[2]}%
                                    )
                                )`
                            }} />
                            <input value={this.state.hsla[2]} min={0} max={100} step={1} type="range" onChange={e => this.updateLightness(e.target.value)} onMouseUp={e => this.updateLightness(e.target.value)} style={{
                                background: `linear-gradient(to right,
                                    #000000,
                                    hsl(
                                        ${this.state.hsla[0]},
                                        ${this.state.hsla[1]}%,
                                        50%
                                    ),
                                    #ffffff
                                )`
                            }} />
                            {this.props.alpha && <input value={this.state.hsla[3]} min={0} max={1} step={0.01} type="range" onChange={e => this.updateAlpha(e.target.value)} onMouseUp={e => this.updateAlpha(e.target.value)} style={{
                                backgroundImage: `linear-gradient(to right,
                                    rgba(0,0,0,0),
                                    hsl(
                                        ${this.state.hsla[0]},
                                        ${this.state.hsla[1]}%,
                                        ${this.state.hsla[2]}%
                                    )
                                ),
                                url(${checker})`
                            }} />}
                            <span>
                                <input placeholder="#ffffff" value={this.state.hex} onChange={e => this.setHex(e.target.value)} />
                            </span>
                        </div>
                    </div>
                } />}
            </div>
        );
    }
}

export default ColorPicker;