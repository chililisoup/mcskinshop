import React from 'react';
import * as THREE from 'three';
import skinmodel from '@/skinmodel.json';
import SettingsRibbon from '@components/basic/settingsribbon';
import AbstractMode, { Props } from './abstractmode';

const ANIMATIONS = ['Walk', 'Crouch Walk'] as const;

type AState = {
  explode: boolean;
  animate: boolean;
  speed: number;
  animation: (typeof ANIMATIONS)[number];
};

export default class AnimateMode extends AbstractMode<AState> {
  time = 0;
  idleTime = 0;

  constructor(props: Props) {
    super(props, 'Animate');

    if (!this.state)
      this.state = {
        explode: false,
        animate: this.props.manager.get().animatePlayerOnStart,
        speed: 0.5,
        animation: 'Walk'
      };
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

  renderFrame = (delta: number) => {
    const pivots = this.props.instance.doll.pivots;

    if (this.state.animate) {
      this.time += delta * 8 * this.state.speed;
      this.idleTime += delta * 8;
      if (this.time > Math.PI * 20) this.time -= Math.PI * 20;
    }

    pivots.head.position.copy(pivots.head.userData.defaultPosition as THREE.Vector3Like);
    pivots.torso.position.copy(pivots.torso.userData.defaultPosition as THREE.Vector3Like);
    pivots.leftArm.position.copy(pivots.leftArm.userData.defaultPosition as THREE.Vector3Like);
    pivots.rightArm.position.copy(pivots.rightArm.userData.defaultPosition as THREE.Vector3Like);
    pivots.leftLeg.position.copy(pivots.leftLeg.userData.defaultPosition as THREE.Vector3Like);
    pivots.rightLeg.position.copy(pivots.rightLeg.userData.defaultPosition as THREE.Vector3Like);
    pivots.leftElytraWing.position.copy(
      pivots.leftElytraWing.userData.defaultPosition as THREE.Vector3Like
    );
    pivots.rightElytraWing.position.copy(
      pivots.rightElytraWing.userData.defaultPosition as THREE.Vector3Like
    );

    this.updateExplode();

    const rotation = Math.sin(this.time) * this.state.speed;

    pivots.leftLeg.rotation.x = rotation;
    pivots.rightLeg.rotation.x = -rotation;
    pivots.leftArm.rotation.x = -rotation;
    pivots.rightArm.rotation.x = rotation;

    pivots.leftArm.rotation.z = Math.sin(this.idleTime * 0.3) * 0.075 + 0.075;
    pivots.rightArm.rotation.z = -pivots.leftArm.rotation.z;

    pivots.cape.rotation.x = Math.sin(this.idleTime * 0.1) * 0.05 + 0.75 * this.state.speed + 0.1;

    const oldWingRotation = pivots.leftElytraWing.rotation.clone();
    let newWingRotation = new THREE.Euler(Math.PI / 12, Math.PI / 36, Math.PI / 12);

    switch (this.state.animation) {
      case 'Walk':
        pivots.torso.rotation.x = 0;

        break;
      case 'Crouch Walk':
        pivots.head.position.y -= 4.0;
        pivots.torso.position.y -= 3.0;

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

        pivots.leftElytraWing.position.y -= 3.0;

        pivots.rightElytraWing.position.y -= 3.0;

        newWingRotation = new THREE.Euler((Math.PI * 2) / 9, Math.PI / 36, Math.PI / 4);

        break;
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
      <SettingsRibbon
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
                max: 2,
                step: 0.01
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
