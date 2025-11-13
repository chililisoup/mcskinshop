import React from 'react';
import * as THREE from 'three';
import * as Util from '@tools/util';
import skinmodel from '@/skinmodel.json';
import AbstractMode, { Props } from '@components/special/viewport/modes/abstractmode';
import PropertiesList from '@components/basic/propertieslist';
import { PreferenceManager } from '@tools/prefman';

const ANIMATIONS = ['Walk', 'Crouch Walk', 'Swim', 'Fly'] as const;

type AState = {
  explode: boolean;
  animate: boolean;
  speed: number;
  animation: (typeof ANIMATIONS)[number];
};

export default class AnimateMode extends AbstractMode<AState> {
  data: {
    time: number;
    idleTime: number;
    [key: string]: unknown;
  };

  constructor(props: Props) {
    super(props, 'Animate');

    if (!this.state)
      this.state = {
        explode: false,
        animate: PreferenceManager.get().animatePlayerOnStart,
        speed: 1,
        animation: 'Walk'
      };

    const data = this.props.instance.scene.userData;
    data.time ??= 0;
    data.idleTime ??= 0;
    this.data = data as typeof this.data;
  }

  componentDidMount() {
    super.componentDidMount();
    this.updateExplode();
  }

  componentDidUpdate(_prevProps: Readonly<Props>, prevState: Readonly<AState>) {
    if (this.state.explode !== prevState.explode) this.updateExplode();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.updateExplode(false);
  }

  updateExplode = (explode?: boolean) => {
    const mod = (explode ?? this.state.explode) ? 2.5 : 0;
    const pivots = this.props.instance.doll.pivots;

    pivots.head.position.y = skinmodel.head.position[1] + mod;

    pivots.leftLeg.position
      .fromArray(skinmodel.torso.children.leftLeg.position)
      .add(new THREE.Vector3(mod / 2, -mod, 0));
    pivots.rightLeg.position
      .fromArray(skinmodel.torso.children.rightLeg.position)
      .add(new THREE.Vector3(-mod / 2, -mod, 0));

    pivots.leftArm.position.x = skinmodel.torso.children.leftArm.position[0] + mod;
    pivots.rightArm.position.x = skinmodel.torso.children.rightArm.position[0] - mod;

    pivots.cape.position.z = skinmodel.torso.children.cape.position[2] - mod * 5;
    pivots.leftElytraWing.position.z =
      skinmodel.torso.children.leftElytraWing.position[2] - mod * 5;
    pivots.rightElytraWing.position.z =
      skinmodel.torso.children.rightElytraWing.position[2] - mod * 5;
  };

  capturePose = () => {
    this.updateSetting('explode', false);
    this.props.instance.clearSavedPose();
    this.props.instance.savePose();
    this.props.instance.setState({ modeElement: this.props.instance.modes.pose });
  };

  onKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ') this.updateSetting('animate', !this.state.animate);
  };

  renderFrame = (delta: number) => {
    const pivots = this.props.instance.doll.pivots;

    if (this.state.animate) {
      this.data.time = (this.data.time + delta * 8 * this.state.speed) % (24 * Math.PI);
      this.data.idleTime = (this.data.idleTime + delta * 8) % (24 * Math.PI);
    }

    this.props.instance.resetPose(pivots.leftElytraWing, pivots.rightElytraWing);
    pivots.leftElytraWing.position.copy(
      pivots.leftElytraWing.userData.defaultPosition as THREE.Vector3Like
    );
    pivots.rightElytraWing.position.copy(
      pivots.rightElytraWing.userData.defaultPosition as THREE.Vector3Like
    );

    this.updateExplode();

    const rotation = 0.3 * Math.cos(this.data.time / 3) * this.state.speed;

    pivots.rightArm.rotation.x = -rotation;
    pivots.leftArm.rotation.x = rotation;
    pivots.rightLeg.rotation.x = rotation * 1.4;
    pivots.leftLeg.rotation.x = -rotation * 1.4;

    pivots.rightLeg.rotation.y = -0.005;
    pivots.leftLeg.rotation.y = 0.005;
    pivots.rightLeg.rotation.z = -0.005;
    pivots.leftLeg.rotation.z = 0.005;

    pivots.leftArm.rotation.z = Math.sin(this.data.idleTime / 4) * 0.075 + 0.075;
    pivots.rightArm.rotation.z = -pivots.leftArm.rotation.z;

    pivots.cape.rotation.x = 0.15 + this.state.speed / 4;

    const oldWingRotation = pivots.leftElytraWing.rotation.clone();
    const newWingRotation = new THREE.Euler(Math.PI / 12, Math.PI / 36, Math.PI / 12);

    switch (this.state.animation) {
      case 'Walk':
        break;
      case 'Crouch Walk': {
        pivots.head.position.y -= 4.0;
        pivots.torso.position.y -= 3.0;

        const worldPos = pivots.leftElytraWing.getWorldPosition(new THREE.Vector3());

        pivots.torso.rotation.x = 0.5;

        pivots.leftArm.rotation.x -= 0.1;
        pivots.rightArm.rotation.x -= 0.1;

        pivots.leftArm.position.y += 0.2;
        pivots.rightArm.position.y += 0.2;

        pivots.leftArm.position.z += 1.0;
        pivots.rightArm.position.z += 1.0;

        pivots.leftLeg.rotation.x -= 0.5;
        pivots.rightLeg.rotation.x -= 0.5;

        pivots.leftLeg.position.y += 2;
        pivots.rightLeg.position.y += 2;

        pivots.leftLeg.position.z += 0.8;
        pivots.rightLeg.position.z += 0.8;

        const localPos = pivots.leftElytraWing.parent?.worldToLocal(worldPos);
        if (localPos) pivots.leftElytraWing.position.copy(localPos);
        pivots.rightElytraWing.position.copy(
          new THREE.Vector3(-1, 1, 1).multiply(pivots.leftElytraWing.position)
        );

        newWingRotation.x = (Math.PI * 2) / 9 - 0.5;
        newWingRotation.y = Math.PI / 8;
        newWingRotation.z = (Math.PI * 2) / 9;

        break;
      }
      case 'Swim': {
        pivots.torso.rotation.x = Math.PI / 2;
        pivots.torso.position.y = 2;
        pivots.torso.position.z = 4.8;

        pivots.head.rotation.x = Math.PI / 4;
        pivots.head.position.y = 2;
        pivots.head.position.z = 4.8;

        const quadraticArmUpdate = (rot: number) => {
          return -65.0 * rot + rot * rot;
        };

        const swimPos = ((this.data.time % (8 * Math.PI)) * 26) / (8 * Math.PI);

        if (swimPos < 14.0) {
          pivots.leftArm.rotation.x = 0;
          pivots.rightArm.rotation.x = 0;
          pivots.leftArm.rotation.y = Math.PI;
          pivots.rightArm.rotation.y = Math.PI;
          pivots.leftArm.rotation.z =
            Math.PI + (1.8707964 * quadraticArmUpdate(swimPos)) / quadraticArmUpdate(14.0);
          pivots.rightArm.rotation.z =
            Math.PI - (1.8707964 * quadraticArmUpdate(swimPos)) / quadraticArmUpdate(14.0);
        } else if (swimPos >= 14.0 && swimPos < 22.0) {
          const rotScale = (swimPos - 14.0) / 8.0;
          pivots.leftArm.rotation.x = (Math.PI / 2) * rotScale;
          pivots.rightArm.rotation.x = (Math.PI / 2) * rotScale;
          pivots.leftArm.rotation.y = Math.PI;
          pivots.rightArm.rotation.y = Math.PI;
          pivots.leftArm.rotation.z = 5.012389 - 1.8707964 * rotScale;
          pivots.rightArm.rotation.z = 1.2707963 + 1.8707964 * rotScale;
        } else if (swimPos >= 22.0 && swimPos < 26.0) {
          const rotScale = (swimPos - 22.0) / 4.0;
          pivots.leftArm.rotation.x = Math.PI / 2 - (Math.PI / 2) * rotScale;
          pivots.rightArm.rotation.x = Math.PI / 2 - (Math.PI / 2) * rotScale;
          pivots.leftArm.rotation.y = Math.PI;
          pivots.rightArm.rotation.y = Math.PI;
          pivots.leftArm.rotation.z = Math.PI;
          pivots.rightArm.rotation.z = Math.PI;
        }

        break;
      }
      case 'Fly': {
        pivots.torso.rotation.x = Math.PI / 2;
        pivots.torso.position.y = 2;
        pivots.torso.position.z = 4.8;

        pivots.head.rotation.x = Math.PI / 4;
        pivots.head.position.y = 2;
        pivots.head.position.z = 4.8;

        const factor = 1.0 - Math.pow(this.state.speed / 6, 1.5);

        newWingRotation.x = Util.lerp(factor, Math.PI / 12, Math.PI / 9) - Math.PI / 12;
        newWingRotation.y += 0.0;
        newWingRotation.z = Util.lerp(factor, Math.PI / 12, Math.PI / 2) - Math.PI / 12;

        break;
      }
    }

    const wingDelta = Math.min(delta * 6, 1);
    const wingRotation = new THREE.Euler(
      newWingRotation.x * wingDelta + oldWingRotation.x * (1 - wingDelta),
      newWingRotation.y * wingDelta + oldWingRotation.y * (1 - wingDelta),
      newWingRotation.z * wingDelta + oldWingRotation.z * (1 - wingDelta)
    );

    pivots.leftElytraWing.setRotationFromEuler(wingRotation);
    pivots.rightElytraWing.setRotationFromEuler(
      new THREE.Euler(wingRotation.x, -wingRotation.y, -wingRotation.z)
    );
  };

  renderRibbon = () => {
    return (
      <PropertiesList
        type="ribbon"
        booleanFallback={(id, value) => {
          if (id === 'explode') this.updateSetting(id, value, true);
          if (id === 'animate') this.updateSetting('animate', value);
        }}
        numberFallback={(id, value) => {
          if (id === 'speed') this.updateSetting(id, value);
        }}
        stringFallback={(id, value) => {
          if (id === 'animation')
            this.updateSetting(id, value as (typeof ANIMATIONS)[number], true);
        }}
        properties={[
          {
            name: 'Explode',
            id: 'explode',
            type: 'checkbox',
            value: this.state.explode
          },
          {
            name: 'Animate',
            id: 'animate',
            type: 'checkbox',
            value: this.state.animate,
            siblings: [
              {
                name: 'Speed',
                id: 'speed',
                type: 'range',
                value: this.state.speed,
                min: 0,
                max: 5,
                step: 0.01,
                snap: 0.1
              }
            ]
          },
          {
            name: 'Animation',
            id: 'animation',
            unlabeled: true,
            type: 'select',
            value: this.state.animation,
            options: ANIMATIONS
          },
          {
            name: 'Capture Pose',
            id: 'capturePose',
            type: 'button',
            onClick: this.capturePose
          }
        ]}
      />
    );
  };
}
