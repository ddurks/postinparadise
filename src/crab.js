import * as THREE from "three";

import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

class MultiLineText {
  constructor(
    textArray,
    position,
    font,
    size = 0.3,
    lineHeight = 1.2,
    color = 0x00ff00
  ) {
    this.group = new THREE.Group();
    this.position = position;

    const textMaterial = new THREE.MeshBasicMaterial({ color });
    this.textMeshes = [];

    for (let i = 0; i < textArray.length; i++) {
      const textGeometry = new TextGeometry(textArray[i], {
        font,
        size,
        height: 0.02, // Adjust the extrusion thickness as needed
      });

      textGeometry.computeBoundingBox(); // Calculate the bounding box

      const textMesh = new THREE.Mesh(textGeometry, textMaterial);

      // Center the text horizontally
      const textWidth =
        textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
      textMesh.position.x = -textWidth / 2;

      // Position each line of text vertically
      textMesh.position.y = -i * lineHeight;

      this.group.add(textMesh);
      this.textMeshes.push(textMesh);
    }

    // Set the overall position of the group
    this.group.position.copy(position);
  }

  addToScene(scene) {
    scene.add(this.group);
  }
}

export const Crab = class {
  createWalkPath = () => {
    const stops = 3;
    const range = 7;

    let newPath = [];
    for (let i = 0; i < stops; i++) {
      newPath.push({
        x: this.getRandomInRange(-range, range),
        z: this.getRandomInRange(-range, range),
      });
    }
    return newPath;
  };

  constructor(gltfLoader, scene, island) {
    this.animationsMap = new Map();
    this.walkTime = 0;
    this.walkPath = this.createWalkPath();
    this.island = island;

    gltfLoader.load("./glb/screencrab.glb", (gltf) => {
      gltf.scene.traverse((object) => {
        if (object.isMesh) object.castShadow = true;
      });
      this.crabObject = gltf.scene.getObjectByName("Armature");
      this.crabObject.position.set(
        this.island.position.x + 1,
        this.island.position.y + 10,
        this.island.position.z + 1
      );
      scene.add(this.crabObject);

      this.addDecal(scene);

      this.crabMixer = new THREE.AnimationMixer(this.crabObject);
      gltf.animations.forEach((a) => {
        this.animationsMap.set(a.name, this.crabMixer.clipAction(a));
      });
      this.animationsMap.get("walk").fadeIn(1).play();
    });
  }

  addDecal(scene) {
    new FontLoader().load("fonts/helvetiker_regular.typeface.json", (font) => {
      const textArray = ["crab.com", "by", "drawvid", "test", "test"];
      const position = new THREE.Vector3(
        this.crabObject.position.x,
        this.crabObject.position.y + 2,
        this.crabObject.position.z
      ); // Center point
      this.multiLineText = new MultiLineText(textArray, position, font, 0.1, 0.15);
      this.multiLineText.addToScene(scene);
      this.multiLineText.group.rotation.copy(this.crabObject.rotation);
    });
  }

  getRandomInRange = (min, max) => {
    return Math.random() * (max - min) + min;
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
  };

  crabWalk = (delta) => {
    // Simulate walking along the defined path
    const walkSpeed = 0.001; // Adjust the speed of walking here

    if (this.walkTime >= 1) {
      this.walkTime = 0; // Restart walking
      this.resetWalkPath();
    } else {
      this.walkTime += walkSpeed;
    }

    // Interpolate the position along the path
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

    this.currentUnitVector = this.getUnitVector2D(new THREE.Vector2(currentPos.x, currentPos.z), new THREE.Vector2(nextPos.x, nextPos.z));

    const xPos = currentPos.x + (nextPos.x - currentPos.x) * t;
    const zPos = currentPos.z + (nextPos.z - currentPos.z) * t;
    this.crabObject.position.set(xPos, this.crabObject.position.y, zPos);

    // Calculate the angle between current and next positions
    const deltaX = nextPos.x - currentPos.x;
    const deltaZ = nextPos.z - currentPos.z;
    const angle = Math.atan2(deltaZ, deltaX);

    // Convert the angle to Euler angles and set the object's rotation
    const euler = new THREE.Euler(0, -angle + Math.PI / 2, 0);
    this.crabObject.rotation.copy(euler);
  };

  updateCrab = (raycaster, delta) => {
    this.crabWalk();

    raycaster.set(this.crabObject.position, new THREE.Vector3(0, -1, 0)); // Pointing downward

    const intersects = raycaster.intersectObject(this.island);

    if (intersects.length > 0) {
      const intersectionPoint = intersects[0].point;
      this.crabObject.position.set(
        this.crabObject.position.x,
        intersectionPoint.y + 0.45,
        this.crabObject.position.z
      );
    }

    this.multiLineText.group.position.set(
      this.crabObject.position.x + (this.currentUnitVector.x * 0.8),
      this.crabObject.position.y + 0.80,
      this.crabObject.position.z + (this.currentUnitVector.y * 0.8)
    );
    this.multiLineText.group.rotation.copy(this.crabObject.rotation);
    this.crabMixer.update(delta);
  };

  getUnitVector2D = (positionA, positionB) => {
    // Calculate the vector from A to B
    const directionVector = new THREE.Vector2();
    directionVector.subVectors(positionB, positionA);

    // Normalize the vector to get a unit vector
    const unitVector = new THREE.Vector2();
    return unitVector.copy(directionVector).normalize();
  };
};
