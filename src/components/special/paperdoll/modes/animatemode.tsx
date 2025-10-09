import React from 'react';
import * as THREE from 'three';
import skinmodel from '@/skinmodel.json';
import AbstractMode from '@components/special/paperdoll/modes/abstractmode';
import SettingsRibbon from '@components/basic/settingsribbon';
import PaperDoll from '@components/special/paperdoll/paperdoll';

export const ANIMATIONS = ['Walk', 'Crouch Walk'] as const;

export default class AnimateMode extends AbstractMode {
  time = 0;
  idleTime = 0;

  constructor(instance: PaperDoll) {
    super(instance, 'Animate');
  }

  init = () => {
    this.updateExplode();
  };

  dispose = () => undefined;

  updateExplode = (explode?: boolean) => {
    const mod = (explode ?? this.instance.state.explode) ? 2.5 : 0;
    const pivots = this.instance.doll.pivots;

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

  animate = (delta: number) => {
    const pivots = this.instance.doll.pivots;

    if (this.instance.state.anim) {
      this.time += delta * 8 * this.instance.state.animSpeed;
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

    const rotation = Math.sin(this.time) * this.instance.state.animSpeed;

    pivots.leftLeg.rotation.x = rotation;
    pivots.rightLeg.rotation.x = -rotation;
    pivots.leftArm.rotation.x = -rotation;
    pivots.rightArm.rotation.x = rotation;

    pivots.leftArm.rotation.z = Math.sin(this.idleTime * 0.3) * 0.075 + 0.075;
    pivots.rightArm.rotation.z = -pivots.leftArm.rotation.z;

    pivots.cape.rotation.x =
      Math.sin(this.idleTime * 0.1) * 0.05 + 0.75 * this.instance.state.animSpeed + 0.1;

    const oldWingRotation = pivots.leftElytraWing.rotation.clone();
    let newWingRotation = new THREE.Euler(Math.PI / 12, Math.PI / 36, Math.PI / 12);

    switch (this.instance.state.animation) {
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

  settingsRibbon = (
    <SettingsRibbon
      booleanCallback={(id, value) => {
        if (id === 'explode') this.instance.updateSettingFinish(id, value);
        if (id === 'animate') this.instance.updateSetting('anim', value);
      }}
      numberCallback={(id, value) => {
        if (id === 'animSpeed') this.instance.updateSetting(id, value);
      }}
      stringCallback={(id, value) => {
        if (id === 'animation') this.instance.updateSettingFinish(id, value);
      }}
      properties={[
        {
          name: 'Explode',
          id: 'explode',
          type: 'checkbox',
          value: this.instance.state.explode
        },
        {
          name: 'Animate',
          id: 'animate',
          type: 'checkbox',
          value: this.instance.state.anim,
          siblings: [
            {
              name: 'Animation Speed',
              id: 'animSpeed',
              type: 'range',
              value: this.instance.state.animSpeed,
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
          value: this.instance.state.animation,
          options: ANIMATIONS
        },
        {
          name: 'Capture Pose',
          id: 'capturePose',
          type: 'button',
          onClick: this.instance.capturePose
        }
      ]}
    />
  );
}
