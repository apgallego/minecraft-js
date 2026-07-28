import * as THREE from "three";

export class Tool extends THREE.Group {
  animate = false; //animation for the tool
  animationStart = 0; //start time for the animation
  animationSpeed = 0.025;
  animation = undefined; //active animation
  toolMesh = undefined; //3D mesh of the tool

  setMesh(mesh) {
    this.clear();
    this.add(mesh);
    mesh.reactiveShadow = true;
    mesh.castShadow = true;

    this.position.set(0.7, -0.55, -0.5);
    this.scale.set(0.025, 0.025, 0.025);
    this.rotation.z = Math.PI / 7;
    this.rotation.y = Math.PI + -1.5;
  }
}
