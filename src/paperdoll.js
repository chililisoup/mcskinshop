import React, { Component } from "react";
import * as THREE from 'three';
import * as ImgMod from './imgmod';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from "three/addons/postprocessing/SMAAPass";
import steve from "./assets/steve.png";
import alex from "./assets/alex.png";
import matcap from "./assets/matcap.png";
import skinmodel from "./skinmodel.json";

class PaperDollSettings extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            slim: props.settings.slim || false,
            anim: props.settings.anim == null ? true : props.settings.anim,
            animSpeed: props.settings.animSpeed == null ? 0.5 : props.settings.animSpeed,
            explode: props.settings.explode || false,
            shade: props.settings.shade == null ? true : props.settings.shade,
            lightAngle: props.settings.lightAngle == null ? Math.PI / 4 : props.settings.lightAngle,
            lightFocus: props.settings.lightFocus == null ? Math.SQRT2 : props.settings.lightFocus,
            pose: props.settings.pose || false,
            fov: props.settings.fov == null ? 80 : props.settings.fov
        }
    }

    componentDidUpdate = prevProps => {
        if (this.props.settings.slim !== prevProps.settings.slim)
            this.setState({slim: this.props.settings.slim});
    }

    updateSetting = (setting, value) => {
        const update = {};
        update[setting] = value;
        this.setState(update);
        this.props.updateSetting(setting, value);
    }

    settingEdit = (setting, from, to) => {
        const update = {};
        update[setting] = from;
        this.setState(update);
        this.props.updateSetting(setting, from);

        return () => this.settingEdit(setting, to, from);
    }

    updateSettingFinish = (setting, value) => {
        const from = this.state[setting];

        this.updateSetting(setting, value);

        this.props.addEdit(
            "change " + setting,
            () => this.settingEdit(setting, from, value)
        );
    }

    toggleAnim = bool => {
        this.setState({
            anim: bool,
            pose: false
        });
        this.props.updateSetting("anim", bool);
    }

    togglePose = bool => {
        this.setState({
            pose: bool,
            anim: false
        });
        this.props.updateSetting("pose", bool);
    }

    render() {
        return (
            <span>
                <div>
                    <label htmlFor="slimToggle">Slim</label>
                    <input type="checkbox" id="slimToggle" checked={this.state.slim} onChange={e => this.updateSettingFinish("slim", e.target.checked)}/>
                    <label htmlFor="animToggle">Animate</label>
                    <input type="checkbox" id="animToggle" checked={this.state.anim} onChange={e => this.toggleAnim(e.target.checked)}/>
                    <input type="range" min={0} max={2} step={0.01} value={this.state.animSpeed} onChange={e => this.updateSetting("animSpeed", e.target.value)}/>
                    <label htmlFor="explodeToggle">Explode</label>
                    <input type="checkbox" id="explodeToggle" checked={this.state.explode} onChange={e => this.updateSettingFinish("explode", e.target.checked)}/>
                </div>
                <div>
                    <label htmlFor="shadeToggle">Shade</label>
                    <input type="checkbox" id="shadeToggle" checked={this.state.shade} onChange={e => this.updateSettingFinish("shade", e.target.checked)}/>
                    <label htmlFor="lightFocus">Light Focus</label>
                    <input type="range" id="lightFocus" min={0} max={10} step={0.1} value={Math.sqrt(this.state.lightFocus)} onChange={e => this.updateSetting("lightFocus", e.target.value ** 2)}/>
                </div>
                <div>
                    <label htmlFor="lightAngle">Light Angle</label>
                    <input type="range" id="lightAngle" min={0} max={2 * Math.PI} step={0.1} value={this.state.lightAngle} onChange={e => this.updateSetting("lightAngle", e.target.value)}/>
                    <label htmlFor="poseToggle">Pose</label>
                    <input type="checkbox" id="poseToggle" checked={this.state.pose} onChange={e => this.togglePose(e.target.checked)}/>
                </div>
                <div>
                    <label htmlFor="fov">FOV ({this.state.fov})</label>
                    <input type="range" id="fov" min={30} max={120} step={1} value={this.state.fov} onChange={e => this.updateSetting("fov", e.target.value)}/>
                </div>
                <div>
                    <button onClick={this.props.resetCamera}>Reset Camera</button>
                    <button onClick={this.props.saveRender}>Save Render</button>
                </div>
            </span>
        );
    }
}

class PaperDoll extends Component {
    constructor(props) {
        super(props);

        this.state = {
            anim: true,
            animSpeed: 0.5,
            explode: false,
            shade: true,
            lightAngle: Math.PI / 4,
            lightFocus: Math.SQRT2,
            pose: false,
            fov: 80
        }

        this.canvasRef = React.createRef();
        this.clock = new THREE.Clock();
        this.mousePos = new THREE.Vector2(1, 1);
    }

    componentDidMount() {
        this.sceneSetup();
        this.modelSetup();
        this.updateSlim();
        this.updateExplode();
        this.updateShade();
        this.textureSetup();
        this.startAnimationLoop();

        this.canvasRef.current.addEventListener("mousemove", this.onMouseMove);
        this.canvasRef.current.addEventListener("mousedown", this.onMouseDown);
        this.canvasRef.current.addEventListener("mouseup", this.onMouseUp);
        this.canvasRef.current.addEventListener("contextmenu", this.onContextMenu);
        window.addEventListener("resize", this.handleWindowResize);

        const img = new ImgMod.Img();
        img.render(this.props.skin).then(() => this.setState({slim: img.detectSlimModel()}));
    }

    componentWillUnmount() {
        this.canvasRef.current.removeEventListener("mousemove", this.onMouseMove);
        this.canvasRef.current.removeEventListener("mousedown", this.onMouseDown);
        this.canvasRef.current.removeEventListener("mouseup", this.onMouseUp);
        this.canvasRef.current.removeEventListener("contextmenu", this.onContextMenu);
        window.removeEventListener("resize", this.handleWindowResize);
        window.cancelAnimationFrame(this.requestID);
        this.controls.dispose();
    }

    componentDidUpdate() {   
        this.updateSlim();
        this.updateExplode();
        this.updateShade();
        this.textureSetup();

        this.camera.fov = this.state.fov;
        this.handleWindowResize();
    }

    sceneSetup = () => {
        const width = this.canvasRef.current.parentNode.clientWidth;
        const height = this.canvasRef.current.parentNode.clientHeight;

        this.raycaster = new THREE.Raycaster();

        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvasRef.current,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

        this.camera = new THREE.PerspectiveCamera(this.state.fov, width / height, 0.1, 1000);
        this.camera.position.set(0, 18, 40);
        this.scene.add(this.camera);

        this.controls = new OrbitControls(this.camera, this.canvasRef.current);
        this.controls.target.set(0, 18, 0);
        this.controls.update();
        this.controls.saveState();

        this.composer = new EffectComposer(this.renderer);

        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.outlinePass = new OutlinePass(new THREE.Vector2(width, height), this.scene, this.camera);
        this.outlinePass.hiddenEdgeColor.set(0xffffff);
        this.outlinePass.edgeStrength = 10;
        this.outlinePass.edgeThickness = 3;
        this.composer.addPass(this.outlinePass);

        this.outputPass = new OutputPass();
        this.composer.addPass(this.outputPass);

        this.SMAAPass = new SMAAPass();
        this.composer.addPass(this.SMAAPass);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
        this.camera.add(this.directionalLight);

        this.textureLoader = new THREE.TextureLoader();
        this.matcapMap = this.textureLoader.load(matcap, matcapMap => matcapMap);
    };

    textureSetup = () => {
        const skin = this.props.skin == null ? (this.props.slim ? alex : steve) : this.props.skin;
        this.textureLoader.load(skin, texture => {
            texture.magFilter = THREE.NearestFilter;

            this.materials[this.state.shade ? "shaded" : "flat"].forEach(mat => {
                mat.map = texture;
                mat.needsUpdate = true;
            });
        });
    }

    propagateShade = part => {
        if (part.materialIndex !== null) {
            part.material = this.materials[this.state.shade ? "shaded" : "flat"][part.materialIndex];
        }

        part.children.forEach(this.propagateShade);
    }

    updateShade = () => {
        this.directionalLight.position.set(
            Math.sin(this.state.lightAngle) * this.state.lightFocus,
            0,
            Math.cos(this.state.lightAngle) * this.state.lightFocus
        );

        this.propagateShade(this.doll);
        this.textureSetup();

    }

    eatChild = (name, child) => {
        let part;

        if (child.shape) {
            const geometry = new THREE.BoxGeometry(child.shape[0], child.shape[1], child.shape[2]);

            if (child.uv) {
                const uvAttribute = geometry.getAttribute("uv");
                child.uv.forEach((v, i) => uvAttribute.setXY(i, v[0] / 64, v[1] / 64));
            }

            let shadedMat, flatMat;

            part = new THREE.Mesh(geometry);
            if (child.renderType === "cutout") {
                part.renderType = "cutout";

                shadedMat = new THREE.MeshLambertMaterial({
                    side: THREE.DoubleSide,
                    transparent: true,
                    flatShading: true,
                    alphaTest: 0.001
                });

                flatMat = new THREE.MeshMatcapMaterial({
                    side: THREE.DoubleSide,
                    transparent: true,
                    flatShading: true,
                    alphaTest: 0.001,
                    matcap: this.matcapMap
                });
            } else {
                shadedMat = new THREE.MeshLambertMaterial({
                    flatShading: true
                });

                flatMat = new THREE.MeshMatcapMaterial({
                    flatShading: true,
                    matcap: this.matcapMap
                });
            }

            part.materialIndex = this.materials.shaded.push(shadedMat) - 1;
            this.materials.flat.push(flatMat);

        } else part = new THREE.Group();

        if (child.children) for (const [k, v] of Object.entries(child.children))
            part.add(this.eatChild(k, v));

        if (child.poseable) {
            part.poseable = true;
            this.pivots[name] = part;
        }
        if (child.position) part.position.fromArray(child.position);

        part.name = name;

        return part;
    }

    modelSetup = () => {
        this.materials = {
            shaded: [],
            flat: []
        };
        this.pivots = {};
        this.doll = new THREE.Object3D();
        this.doll.name = "doll";
        this.scene.add(this.doll);

        for (const [k, v] of Object.entries(skinmodel))
            this.doll.add(this.eatChild(k, v));
    };

    updateSlim = () => {
        this.pivots.rightArm.children[0].visible = !this.props.slim;
        this.pivots.rightArm.children[1].visible = this.props.slim;
        this.pivots.leftArm.children[0].visible = !this.props.slim;
        this.pivots.leftArm.children[1].visible = this.props.slim;
    };

    updateExplode = () => {
        let mod = this.state.explode ? 2.5 : 0;

        this.pivots.head.position.y = skinmodel.head.position[1] + mod;

        this.pivots.leftLeg.position.fromArray(skinmodel.torso.children.leftLeg.position).add(new THREE.Vector3(mod / 2, -mod, 0));
        this.pivots.rightLeg.position.fromArray(skinmodel.torso.children.rightLeg.position).add(new THREE.Vector3(-mod / 2, -mod, 0));

        this.pivots.leftArm.position.x = skinmodel.torso.children.leftArm.position[0] + mod;
        this.pivots.rightArm.position.x = skinmodel.torso.children.rightArm.position[0] - mod;
    }

    resetPose = () => {
        Object.values(this.pivots).forEach(pivot => {
            pivot.rotation.x = 0;
            pivot.rotation.y = 0;
            pivot.rotation.z = 0;
        });
    }

    animate = delta => {
        if (this.state.anim) {
            this.time = this.time || 0;
            this.time += delta * 8 * this.state.animSpeed;
            this.idleTime = this.idleTime || 0;
            this.idleTime += delta * 8;
            if (this.time > Math.PI * 20) this.time -= Math.PI * 20;
        }

        let rotation = Math.sin(this.time) * this.state.animSpeed;
        this.pivots.leftLeg.rotation.x = rotation;
        this.pivots.rightLeg.rotation.x = -rotation;
        this.pivots.leftArm.rotation.x = -rotation;
        this.pivots.rightArm.rotation.x = rotation;

        this.pivots.leftArm.rotation.z = Math.sin(this.idleTime * 0.3) * 0.075 + 0.075;
        this.pivots.rightArm.rotation.z = -this.pivots.leftArm.rotation.z;
    }

    findPosableAncestor = part => {
        if (part.poseable) return part;
        if (part.parent) return this.findPosableAncestor(part.parent);
        return false;
    }

    filterOutline = part => {
        let children = [];

        if (part.children.length > 0) {
            part.children.forEach(child => {
                children = children.concat(this.filterOutline(child));
            });
        } else if (part.renderType !== "cutout" && !part.poseable && part.visible)
            children = [part];

        return children;
    }

    pose = () => {
        if (this.oldMousePos && this.selectedObject) {
            if (this.mousePos.equals(this.oldMousePos)) return;

            let axis = new THREE.Vector3();
            this.camera.getWorldDirection(axis);

            const oldRad = new THREE.Vector2().copy(this.oldMousePos).sub(this.posePivot).angle();
            const newRad = new THREE.Vector2().copy(this.mousePos).sub(this.posePivot).angle();
            let angle = oldRad - newRad;

            const parentInvQuat = this.selectedObject.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
            const rotQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
            const worldQuat = this.selectedObject.getWorldQuaternion(new THREE.Quaternion());

            const finalQuat = parentInvQuat.clone().multiply(new THREE.Quaternion().multiplyQuaternions(rotQuat, worldQuat));

            this.selectedObject.setRotationFromQuaternion(finalQuat);

            this.oldMousePos = new THREE.Vector2().copy(this.mousePos);
            return;
        }

        this.raycaster.setFromCamera(this.mousePos, this.camera);
        const intersects = this.raycaster.intersectObject(this.scene, true);
        const poseable = intersects.length > 0 ? this.findPosableAncestor(intersects[0].object) : false;

        if (poseable) {
            this.selectedObject = poseable;
            this.outlinePass.selectedObjects = this.filterOutline(poseable);
        } else {
            this.selectedObject = null;
            this.outlinePass.selectedObjects = [];
        }
    }

    renderFrame = () => {
        const delta = this.clock.getDelta();

        if (this.state.pose) this.pose();
        else this.animate(delta);

        this.composer.render();
    }

    startAnimationLoop = () => {
        this.renderFrame();

        this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
    };

    poseUndo = (obj, start) => {
        const redoStart = obj.rotation.clone()
        const redoProphecy = () => this.poseUndo(obj, redoStart);
        obj.setRotationFromEuler(start);
        return redoProphecy;
    }

    onMouseMove = e => {
        if (!this.state.pose) return;

        const width = this.canvasRef.current.parentNode.clientWidth;
        const height = this.canvasRef.current.parentNode.clientHeight;
        
        this.mousePos.x = (e.offsetX / width) * 2 - 1;
        this.mousePos.y = (e.offsetY / height) * -2 + 1;

        if (this.queuedPoseEdit) {
            this.queuedPoseEdit = null;
            const obj = this.selectedObject;
            const start = obj.rotation.clone();
            this.props.addEdit(
                "pose " + obj.name,
                () => this.poseUndo(obj, start)
            );
        }
    }

    onMouseDown = e => {
        if (!this.state.pose) return;
        if (!this.selectedObject) return;
        if (e.button === 2) return;

        this.controls.enabled = false;

        this.oldMousePos = new THREE.Vector2().copy(this.mousePos);
        const posePivot = this.selectedObject.getWorldPosition(new THREE.Vector3()).project(this.camera);
        this.posePivot = new THREE.Vector2(posePivot.x, posePivot.y);

        this.queuedPoseEdit = this.selectedObject.position.clone();
    }

    onMouseUp = () => {
        this.controls.enabled = true;
        this.oldMousePos = null;
        this.posePivot = null;
        this.queuedPoseEdit = null;
    }

    onContextMenu = e => {
        if (!this.state.pose) return;
        if (!this.selectedObject) return;

        this.controls.enabled = false;
        
        const obj = this.selectedObject;
        const start = obj.rotation.clone();
        this.props.addEdit(
            "reset " + obj.name +  " pose",
            () => this.poseUndo(obj, start)
        );

        obj.rotation.x = 0;
        obj.rotation.y = 0;
        obj.rotation.z = 0;

        e.preventDefault();
    }

    handleWindowResize = () => {
        const width = this.canvasRef.current.parentNode.clientWidth;
        const height = this.canvasRef.current.parentNode.clientHeight;

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    };

    saveRender = () => {
        const scale = Number(window.prompt("Render Scale (1-4):", 1));
        if (isNaN(scale) || scale < 1 || scale > 4) return;

        const width = this.canvasRef.current.parentNode.clientWidth;
        const height = this.canvasRef.current.parentNode.clientHeight;

        this.SMAAPass.enabled = false;
        this.renderer.setSize(width * scale, height * scale);
        this.composer.setSize(width * scale, height * scale);
        this.renderFrame();

        const data = this.renderer.domElement.toDataURL();

        this.SMAAPass.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.handleWindowResize();

        const link = document.createElement("a");
        link.href = data
        const name = window.prompt("Download as...", "My Skin Render");
        if (name === null) return;
        link.download = name + ".png";
        link.click();
    }

    setSlim = bool => {
        let state = {slim: bool};
        if (this.props.skin === steve || this.props.skin === alex) state.skin = bool ? alex : steve;
        this.setState(state);
        this.props.updateSlim(bool);
    }
    setAnim = bool => this.setState({anim: bool == null ? true : bool});
    setAnimSpeed = speed => this.setState({animSpeed: speed == null ? 1 : speed});
    setExplode = bool => this.setState({explode: bool || false});
    setShade = bool => this.setState({shade: bool == null ? true : bool});

    updateSetting = (setting, value) => {
        switch(setting) {
            case "slim":
                let state = {slim: value};
                if (this.props.skin === steve || this.props.skin === alex) state.skin = value ? alex : steve;
                this.setState(state);
                this.props.updateSlim(value);
                break;
            case "anim":
                this.setState({
                    anim: value == null ? true : value,
                    pose: false
                });
                this.outlinePass.selectedObjects = [];
                this.resetPose();
                break;
            case "pose":
                this.setState({
                    pose: value == null ? true : value,
                    anim: false
                });
                this.outlinePass.selectedObjects = [];
                this.resetPose();
                break;
            default:
                const update = {};
                update[setting] = value;
                this.setState(update);
        }
    }

    render() {
        return (
            <div className="paperdoll container">
                <PaperDollSettings
                    settings={{
                        slim: this.props.slim,
                        anim: this.props.anim,
                        animSpeed: this.props.animSpeed,
                        explode: this.props.explode,
                        shade: this.props.shade,
                        lightAngle: this.state.lightAngle,
                        lightFocus: this.state.lightFocus,
                        pose: this.state.pose,
                        fov: this.state.fov
                    }}
                    updateSetting={this.updateSetting}
                    saveRender={this.saveRender}
                    resetCamera={() => this.controls.reset()}
                    addEdit={this.props.addEdit}
                />
                <div className="paperdoll-canvas-container">
                    <canvas className="paperdoll-canvas" ref={this.canvasRef} />
                </div>
            </div>
        );
    }
}

export default PaperDoll;