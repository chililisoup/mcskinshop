import { Component } from 'react';

class ColorPicker extends Component {
    constructor(props) {
        super(props);

        let hsla = [0, 100, 50, 1];

        if (props.default && props.default[0] == "#") hsla = this.hexToHSL(props.default);

        this.state = {
            open: false,
            hsla: hsla,
            color: `hsla(${hsla[0]}, ${hsla[1]}%, ${hsla[2]}%, ${hsla[3]})`
        };

        this.boxStyle = {};
    }

    // https://gist.github.com/xenozauros/f6e185c8de2a04cdfecf
    hexToHSL = hex => {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;

        let max = Math.max(r, g, b)
        let min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max == min) h = s = 0; // achromatic
        else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100), 1];
    }

    updateColor = () => {
        const color = `hsla(${this.state.hsla[0]}, ${this.state.hsla[1]}%, ${this.state.hsla[2]}%, ${this.state.hsla[3]})`
        this.setState({color: color});
        if (this.props.update) this.props.update(color);
    }

    updateHue = hue => {
        let newHSLA = this.state.hsla;
        newHSLA[0] = hue;
        this.setState({hsla: newHSLA});
        this.updateColor();
    }

    updateSaturation = saturation => {
        let newHSLA = this.state.hsla;
        newHSLA[1] = saturation;
        this.setState({hsla: newHSLA});
        this.updateColor();
    }

    updateLightness = lightness => {
        let newHSLA = this.state.hsla;
        newHSLA[2] = lightness;
        this.setState({hsla: newHSLA});
        this.updateColor();
    }

    updateAlpha = alpha => {
        let newHSLA = this.state.hsla;
        newHSLA[3] = alpha;
        this.setState({hsla: newHSLA});
        this.updateColor();
    }

    toggle = () => {
        this.setState({open: !this.state.open});
    }

    //<input type="color" defaultValue={this.props.color || "#000000"} onChange={e => this.props.update(e.target.value)} />
    render() {
        return (
            <div className="color-picker-parent">
                <button className="color-label" style={{backgroundColor: this.state.color}} onClick={this.toggle} />
                <div className="color-picker" style={this.state.open ? {display: "block"} : {display: "none"}}>
                    <div className="container">
                        <input defaultValue={this.state.hsla[0]} min={0} max={360} step={1} type="range" onChange={e => this.updateHue(e.target.value)} style={{
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
                        <input defaultValue={this.state.hsla[1]} min={0} max={100} step={1} type="range" onChange={e => this.updateSaturation(e.target.value)} style={{
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
                        <input defaultValue={this.state.hsla[2]} min={0} max={100} step={1} type="range" onChange={e => this.updateLightness(e.target.value)} style={{
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
                        {this.props.alpha && <input defaultValue={this.state.hsla[3]} min={0} max={1} step={0.01} type="range" onChange={e => this.updateAlpha(e.target.value)} style={{
                            background: `linear-gradient(to right,
                                rgba(0,0,0,0),
                                hsl(
                                    ${this.state.hsla[0]},
                                    ${this.state.hsla[1]}%,
                                    ${this.state.hsla[2]}%
                                )
                            )`
                        }} />}
                    </div>
                </div>
            </div>
        );
    }
}

export default ColorPicker;