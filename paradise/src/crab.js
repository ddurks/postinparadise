import * as THREE from "three";
import * as CANNON from "cannon";

import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

import crabGlb from "../assets/3d/screencrab.glb";

class MultiLineText {
  constructor(
    textArray,
    position,
    font,
    size = 0.3,
    lineHeight = 1.2,
    color = 0x00ff00
  ) {
    const textMaterial = new THREE.MeshBasicMaterial({ color });
    const geometries = [];

    for (let i = 0; i < textArray.length; i++) {
      const textGeometry = new TextGeometry(textArray[i], {
        font,
        size,
        height: 0.02,
      });

      textGeometry.computeBoundingBox();

      const textWidth =
        textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;

      textGeometry.translate(-textWidth / 2, -i * lineHeight, 0);
      geometries.push(textGeometry);
    }

    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    this.mesh = new THREE.Mesh(mergedGeometry, textMaterial);

    this.mesh.position.copy(position);
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }
}

export const Crab = class {
  createWalkPath = () => {
    const stops = 3;
    const range = 20;

    let newPath = [];
    for (let i = 0; i < stops; i++) {
      newPath.push({
        x: this.getRandomInRange(-range, range),
        z: this.getRandomInRange(-range, range),
      });
    }
    return newPath;
  };

  constructor(
    gltfLoader,
    scene,
    world,
    camera,
    position,
    text,
    index,
    color,
    scale = 1.0,
    you = false
  ) {
    this.walkTime = 0;
    this.walkPath = this.createWalkPath();
    this.scene = scene;
    this.world = world;
    this.camera = camera;
    this.content = text;
    this.you = you;

    this.boxShape = new CANNON.Box(new CANNON.Vec3(0.75, 0.75, 0.75));
    const slipperyMaterial = new CANNON.Material("slippery");
    slipperyMaterial.friction = 0;
    this.crabBody = new CANNON.Body({
      mass: 1,
      material: slipperyMaterial,
    });
    this.crabBody.addShape(this.boxShape);
    this.crabBody.position.copy(position);
    this.crabBody.linearDamping = 0.999;

    gltfLoader.load(crabGlb, (gltf) => {
      gltf.scene.traverse((object) => {
        if (object.isMesh) object.castShadow = true;
      });
      this.crabObject = gltf.scene.getObjectByName("Armature");
      this.crabObject.position.set(position.x, position.y, position.z);
      this.crabObject.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh) {
          child.postContent = text;
          child.index = index;
          if (child.material.name === "crabred") {
            child.material.color.set(parseInt(color, 16));
          }
        }
      });
      this.scene.add(this.crabObject);

      this.crabBody.position.set(
        this.crabObject.position.x,
        this.crabObject.position.y,
        this.crabObject.position.z
      );
      world.addBody(this.crabBody);

      if (text) {
        this.addDecal(this.scene, text, scale);
      }

      this.crabBody.isWalking = true;
      this.crabBody.stopDuration = 0;
      this.crabBody.elapsedStopTime = 0;
      this.crabBody.animationsMap = new Map();
      this.crabBody.crabMixer = new THREE.AnimationMixer(this.crabObject);
      gltf.animations.forEach((a) => {
        const action = this.crabBody.crabMixer.clipAction(a);
        if (a.name === "hug") {
          action.loop = THREE.LoopOnce;
          action.clampWhenFinished = true;
          this.crabBody.crabMixer.addEventListener("finished", (e) => {
            if (e.action === action) {
              action.reset();
            }
          });
        }
        this.crabBody.animationsMap.set(a.name, action);
      });
      this.crabBody.animationsMap.get("walk").fadeIn(1).play();
    });
  }

  formatText = (text) => {
    let fifth = 12;
    let textArray = [];
    let numberOfLines = 0;
    for (let i = 0; i < text.length - 1; i += fifth) {
      numberOfLines++;
      if (numberOfLines > 5) {
        textArray[4] += ". . .";
        break;
      }
      textArray.push(text.substring(i, i + fifth));
    }
    return textArray;
  };

  addDecal = (scene, text, scale) => {
    new FontLoader().load(
      import.meta.env.BASE_URL + "helvetiker_regular.typeface.json",
      (font) => {
        const textArray = this.formatText(text);
        const position = new THREE.Vector3(
          this.crabObject.position.x,
          this.crabObject.position.y + 0.75,
          this.crabObject.position.z
        );
        this.multiLineText = new MultiLineText(
          textArray,
          position,
          font,
          0.1,
          0.16
        );
        this.multiLineText.addToScene(scene);
        this.scaleCrab(scale - 1.0);
      }
    );
  };

  setSelected = (isSelected) => {
    if (isSelected) {
      this.box = new THREE.BoxHelper(this.crabObject, 0x00ff00);
      this.scene.add(this.box);
    } else {
      this.scene.remove(this.box);
    }
  };

  getRandomInRange = (min, max) => {
    return Math.random() * (max - min) + min;
  };

  getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  resetWalkPath = () => {
    let finalElement = {
      x: this.walkPath[this.walkPath.length - 1].x,
      z: this.walkPath[this.walkPath.length - 1].z,
    };
    if (this.walkPath) {
      this.walkPath = this.createWalkPath();
      this.walkPath[0] = finalElement;
    }

    let rand = Math.random();
    if (rand < 0.45) {
      this.crabBody.isWalking = false;
      this.crabBody.crabMixer.stopAllAction();
      this.crabBody.animationsMap.get("dance ").stop();
      this.crabBody.animationsMap.get("walk").stop();
      this.crabBody.animationsMap.get("idle").stop();
      if (rand < 0.05) {
        this.crabBody.animationsMap.get("dance ").fadeIn(1).play();
      } else {
        this.crabBody.animationsMap.get("idle").fadeIn(1).play();
      }
      this.crabBody.stopDuration = Math.random() * 10;
      this.crabBody.elapsedStopTime = 0;
    }
  };

  crabWalk = (delta) => {
    if (this.crabBody.isWalking) {
      const walkSpeed = 0.01;

      if (this.walkTime >= 1) {
        this.walkTime = 0;
        this.resetWalkPath();
      } else {
        this.walkTime += walkSpeed;
      }

      const currentWalkIndex = Math.floor(
        this.walkTime * (this.walkPath.length - 1)
      );
      const nextWalkIndex = currentWalkIndex + 1;

      const t = this.walkTime * (this.walkPath.length - 1) - currentWalkIndex;

      const currentPos = this.walkPath[currentWalkIndex];
      let nextPos = this.walkPath[nextWalkIndex];
      if (!nextPos) {
        nextPos = currentPos;
      }

      this.currentUnitVector = this.getUnitVector2D(
        new THREE.Vector2(currentPos.x, currentPos.z),
        new THREE.Vector2(nextPos.x, nextPos.z)
      );

      const xPos = currentPos.x + (nextPos.x - currentPos.x) * t;
      const zPos = currentPos.z + (nextPos.z - currentPos.z) * t;
      const direction = new CANNON.Vec3(
        xPos - this.crabBody.position.x,
        0,
        zPos - this.crabBody.position.z
      );

      direction.normalize();

      const forceMagnitude = 50;
      this.crabBody.applyForce(
        direction.scale(forceMagnitude),
        this.crabBody.position
      );

      this.syncPositions(direction);
    } else {
      this.crabBody.elapsedStopTime += delta;
      this.faceCamera();

      if (this.crabBody.elapsedStopTime > this.crabBody.stopDuration) {
        this.crabBody.animationsMap.get("walk").fadeIn(1).play();
        this.crabBody.isWalking = true;
      }
    }
  };

  faceCamera = () => {
    // Rotate crab to face the camera:
    const crabPosition = new THREE.Vector3(
      this.crabBody.position.x,
      0,
      this.crabBody.position.z
    );
    const directionToCamera = this.camera.position
      .clone()
      .sub(crabPosition)
      .normalize();

    const crabForward = new THREE.Vector3(1, 0, 0); // Assuming crab's initial forward is along the x-axis
    var rotationAngle = crabForward.angleTo(directionToCamera);

    // Determine if we need to rotate clockwise or counterclockwise
    const crossResult = new THREE.Vector3().crossVectors(
      crabForward,
      directionToCamera
    );
    if (crossResult.y < 0) {
      // This depends on your up direction, assuming Y-up here
      rotationAngle *= -1;
    }

    this.crabBody.quaternion.setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotationAngle
    );

    const direction = new CANNON.Vec3(
      this.camera.position.x - this.crabBody.position.x,
      0,
      this.camera.position.z - this.crabBody.position.z
    );

    direction.normalize();
    this.syncPositions(direction);
  };

  setPosition = (position) => {
    this.crabObject.position.set(position);
    this.crabBody.position.set(position);
  };

  syncPositions = (direction) => {
    this.crabObject.position.copy(this.crabBody.position);
    this.crabObject.quaternion.copy(this.crabBody.quaternion);

    const angle = Math.atan2(direction.z, direction.x);
    const quaternion = new CANNON.Quaternion();
    quaternion.setFromEuler(0, -angle, 0, "XYZ");
    this.crabBody.quaternion.copy(quaternion);

    // Three.js uses a different coordinate system convention than cannon.js
    const threeAngle = Math.atan2(-direction.z, direction.x);
    const euler = new THREE.Euler(0, threeAngle + Math.PI / 2, 0);
    this.crabObject.rotation.copy(euler);

    if (this.multiLineText) {
      this.multiLineText.mesh.position.set(
        this.crabBody.position.x + direction.x * 0.8 * this.crabObject.scale.x,
        this.crabBody.position.y + 0.75 * this.crabObject.scale.y,
        this.crabBody.position.z + direction.z * 0.8 * this.crabObject.scale.z
      );
      this.multiLineText.mesh.rotation.copy(euler);
    }

    if (this.box) {
      this.box.update();
    }
  };

  scaleCrab = (scaleFactor) => {
    this.crabObject.scale.x += scaleFactor;
    this.crabObject.scale.y += scaleFactor;
    this.crabObject.scale.z += scaleFactor;
    this.multiLineText.mesh.scale.x += scaleFactor;
    this.multiLineText.mesh.scale.y += scaleFactor;
    this.multiLineText.mesh.scale.z += scaleFactor;

    const currentScale = this.crabObject.scale.x - 0.25;
    this.boxShape.halfExtents.x = currentScale;
    this.boxShape.halfExtents.y = currentScale;
    this.boxShape.halfExtents.z = currentScale;
    this.boxShape.updateConvexPolyhedronRepresentation();
  };

  updateCrab = (delta) => {
    // if (this.getRandomInt(1, 1000) === 2) {
    //   this.scaleCrab(0.3);
    // }
    if (this.crabObject) {
      this.crabWalk(delta);
      this.crabBody.crabMixer.update(delta);
    }
  };

  getUnitVector2D = (positionA, positionB) => {
    const directionVector = new THREE.Vector2();
    directionVector.subVectors(positionB, positionA);

    const unitVector = new THREE.Vector2();
    return unitVector.copy(directionVector).normalize();
  };

  remove = () => {
    if (this.crabObject) {
      this.scene.remove(this.crabObject);
      this.crabObject = null;
    }

    if (this.multiLineText) {
      this.scene.remove(this.multiLineText);
      this.multiLineText = null;
    }

    if (this.crabBody) {
      this.world.removeBody(this.crabBody);
      this.crabBody = null;
    }

    if (this.crabBody.crabMixer) {
      this.crabBody.crabMixer.stopAllAction();
      this.crabBody.crabMixer = null;
    }
  };
};
