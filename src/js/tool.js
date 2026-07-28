import * as THREE from "three";

export class Tool extends THREE.Group {
  animate = false; //animation for the tool
  animationAmplitude = 0.8; //amplitude of the tool animation
  animationDuration = 300; //seconds
  animationStart = 0; //start time for the animation
  animationSpeed = 0.025;
  animation = undefined; //active animation
  toolMesh = undefined; //3D mesh of the tool

  get animationTime() {
    return performance.now() - this.animationStart;
  }

  /**
   * Starts the tool animation
   */
  startAnimation() {
    this.animate = true;
    this.animationStart = performance.now();

    // stop existing animation
    clearTimeout(this.animate);

    //set a tiomut to stop the animation after a certain duration
    this.animation = setTimeout(() => {
      this.animate = false;
    }, this.animationDuration);
  }

  /**
   * Updates the tool animation state
   */
  update() {
    if (this.animate && this.toolMesh) {
      //oscillate the tool
      this.toolMesh.rotation.z =
        this.animationAmplitude *
        Math.sin(this.animationTime * this.animationSpeed);
    }
  }

  /**
   * Sets the active tool mesh
   * @param {THREE.Mesh} mesh
   */
  setMesh(mesh) {
    this.clear();

    this.toolMesh = mesh;
    this.add(mesh);
    mesh.reactiveShadow = true;
    mesh.castShadow = true;

    this.position.set(0.7, -0.55, -0.5);
    this.scale.set(0.025, 0.025, 0.025);
    this.rotation.z = Math.PI / 7;
    this.rotation.y = Math.PI + -1.5;
  }
}
