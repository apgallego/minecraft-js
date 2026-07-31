import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { blocks } from "./blocks";
import { Tool } from "./tool.js";

const CENTER_SCREEN = new THREE.Vector2();
export class Player {
  radius = 0.5;
  height = 1.75;
  jumpSpeed = 10;
  onGround = false;
  maxSpeed = 7;
  input = new THREE.Vector3();
  velocity = new THREE.Vector3();
  // '#' is for private vars
  #worldVelocity = new THREE.Vector3();

  waterLevel = -Infinity; // detectable water level
  underwaterOverlay = null; // blue overlay that sticks to the camera
  baseFov = 70;

  // underwater behavior tuning
  underwaterSpeedMultiplier = 0.5; //relative speed underwater (0..1)
  // keep full initial impulse but apply a small sustained upward force so the ascent is slower (same reach, slower)
  underwaterJumpInitialMultiplier = 1.0; //use full initial jump impulse underwater
  underwaterJumpHoldMax = 1.2; //seconds the sustained thrust can be applied underwater
  underwaterJumpHoldForce = 1.2; // small continuous upward force while holding jump underwater -> makes ascent slower
  jumpHoldRemaining = 0; //remaining counter for sustained thrust
  spaceDown = false;
  jumpHoldRemaining = 0; //remaining counter for sustained thrust
  spaceDown = false;

  camera = new THREE.PerspectiveCamera(
    this.baseFov,
    window.innerWidth / window.innerHeight,
    0.1,
    200,
  );
  controls = new PointerLockControls(this.camera, document.body);

  cameraHelper = new THREE.CameraHelper(this.camera);

  raycaster = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(),
    0,
    4,
  );
  selectedCoords = null;

  toolbarSlots = [1, 2, 3, 4, 5, 6, 7, 8, blocks.empty.id];
  activeSlot = 9;
  activeBlockId = blocks.empty.id;

  tool = new Tool();

  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.position.set(32, 16, 32);
    this.camera.layers.enable(1);
    scene.add(this.camera);

    this.camera.add(this.tool);

    // for debugging
    scene.add(this.cameraHelper);

    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));

    // wireframe mesh visualizing the player's bounding cylinder (hitbox?)
    this.boundsHelper = new THREE.Mesh(
      new THREE.CylinderGeometry(this.radius, this.radius, this.height, 16),
      new THREE.MeshBasicMaterial(), //{ wireframe: true }
    );
    scene.add(this.boundsHelper);

    const selectionMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.3,
      color: 0xffffaa,
      side: THREE.DoubleSide, // show from both sides
      depthWrite: false, // avoid z-fighting with opaque blocks
    });
    const selectionGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    this.selectionHelper = new THREE.Mesh(selectionGeometry, selectionMaterial);
    scene.add(this.selectionHelper);

    // overlay that applies the blue filter when the camera is underwater
    const overlayMaterial = new THREE.MeshBasicMaterial({
      color: 0x306080,
      transparent: true,
      opacity: 0.2,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const overlayGeo = new THREE.PlaneGeometry(2, 2);
    this.underwaterOverlay = new THREE.Mesh(overlayGeo, overlayMaterial);
    this.underwaterOverlay.position.set(0, 0, -0.1); // just in front of the camera
    this.underwaterOverlay.renderOrder = 999;
    this.underwaterOverlay.visible = false;
    this.camera.add(this.underwaterOverlay);

    this.raycaster.layers.set(0);

    document.addEventListener("wheel", this.onWheel.bind(this), {
      passive: false,
    });

    this.selectToolbarSlot(this.activeSlot);
  }

  get worldVelocity() {
    this.#worldVelocity.copy(this.velocity);
    this.#worldVelocity.applyEuler(
      new THREE.Euler(0, this.camera.rotation.y, 0),
    );
    return this.#worldVelocity;
  }

  update(world) {
    const baseY = world.position?.y ?? 0;
    this.waterLevel = baseY + world.params.terrain.waterOffset + 0.4;

    // Show the overlay if the camera is under the water level.
    if (this.underwaterOverlay) {
      this.underwaterOverlay.visible = this.position.y < this.waterLevel;
    }

    this.updateRayCaster(world);
    this.tool.update();
  }

  /**
   * Optional: allows manually setting the water level from outside.
   * @param {number} level
   */
  setWaterLevel(level) {
    this.waterLevel = level;
  }

  /**
   * Updates the raycaster for picking blocks
   * @param {World} world
   */
  updateRayCaster(world) {
    this.raycaster.setFromCamera(CENTER_SCREEN, this.camera);
    const intersections = this.raycaster.intersectObject(world, true);
    if (intersections.length > 0) {
      const intersection = intersections[0];

      // Get the position of the chunk that contains the block.
      const chunk = intersection.object.parent;

      // Get the transformation matrix of the intersected block.
      const blockMatrix = new THREE.Matrix4();
      intersection.object.getMatrixAt(intersection.instanceId, blockMatrix);

      // Extract the position from the block transformation matrix
      // and store it in selectedCoords.
      this.selectedCoords = chunk.position.clone();
      this.selectedCoords.applyMatrix4(blockMatrix);

      // If we are adding a block, move the selection to the nearest empty adjacent block.
      if (this.activeBlockId > blocks.empty.id) {
        this.selectedCoords.add(intersection.normal);
      }

      this.selectionHelper.position.copy(this.selectedCoords);
      this.selectionHelper.visible = true;
    } else {
      this.selectedCoords = null;
      this.selectionHelper.visible = false;
    }
  }

  /**
   * applies a change in velocity dv that is specified in the world frame
   * @param {THREE.Vector3} dv
   */
  applyWorldDeltaVelocity(dv) {
    dv.applyEuler(new THREE.Euler(0, -this.camera.rotation.y, 0));
    this.velocity.add(dv);
  }

  applyInputs(deltaTime) {
    if (this.controls.isLocked) {
      // if we are underwater, move more slowly
      const underwater = this.position.y < this.waterLevel;
      const speedFactor = underwater ? this.underwaterSpeedMultiplier : 1;

      this.velocity.x = this.input.x * speedFactor;
      this.velocity.z = this.input.z * speedFactor;
      this.controls.moveRight(this.velocity.x * deltaTime);
      this.controls.moveForward(this.velocity.z * deltaTime);

      // Sustained upward push while holding space underwater.
      if (
        this.spaceDown &&
        !this.onGround &&
        underwater &&
        this.jumpHoldRemaining > 0
      ) {
        this.velocity.y += this.underwaterJumpHoldForce * deltaTime;
        this.jumpHoldRemaining = Math.max(
          0,
          this.jumpHoldRemaining - deltaTime,
        );
      }

      this.position.y += this.velocity.y * deltaTime;
    }

    document.getElementById("player-position").innerText = this.toString();
  }

  /**
   * Update the position of the player's bounding cylinder helper
   */
  updateBoundsHelper() {
    this.boundsHelper.position.copy(this.position);
    this.boundsHelper.position.y -= this.height / 2;
  }

  /**
   * Return the current position of the player
   * @type {THREE.Vector3}
   */
  get position() {
    return this.camera.position;
  }

  /**
   * Increase the camera FOV and player speed only while W and left Control are pressed.
   */
  run() {
    this.input.z = this.maxSpeed * 1.5;
    this.camera.fov = this.baseFov * 1.1;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Resets FOV.
   */
  resetFov() {
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Handler for "keydown"
   * @param {KeyboardEvent} event
   */
  onKeyDown($event) {
    if (!this.controls.isLocked) {
      this.controls.lock();
    }

    switch ($event.code) {
      case "Digit1":
        this.selectToolbarSlot(1);
        break;
      case "Digit2":
        this.selectToolbarSlot(2);
        break;
      case "Digit3":
        this.selectToolbarSlot(3);
        break;
      case "Digit4":
        this.selectToolbarSlot(4);
        break;
      case "Digit5":
        this.selectToolbarSlot(5);
        break;
      case "Digit6":
        this.selectToolbarSlot(6);
        break;
      case "Digit7":
        this.selectToolbarSlot(7);
        break;
      case "Digit8":
        this.selectToolbarSlot(8);
        break;
      case "Digit9":
        this.selectToolbarSlot(9);
        break;
      case "KeyW":
        this.input.z = this.maxSpeed;
        break;
      case "KeyW" && "ControlLeft":
        this.run();
        break;
      case "KeyA":
        this.input.x = -this.maxSpeed;
        break;
      case "KeyS":
        this.input.z = -this.maxSpeed;
        break;
      case "KeyD":
        this.input.x = this.maxSpeed;
        break;
      case "Space":
        this.spaceDown = true;
        if (this.onGround) {
          // Maintain the initial impulse underwater.
          // Slow jump.
          this.velocity.y +=
            this.jumpSpeed * this.underwaterJumpInitialMultiplier;
          if (this.position.y < this.waterLevel) {
            this.jumpHoldRemaining = this.underwaterJumpHoldMax;
          } else {
            this.jumpHoldRemaining = 0;
          }
        }
        break;
      case "KeyC":
        this.camera.fov = this.baseFov * -5;
        this.camera.updateProjectionMatrix();
        break;
    }
  }

  /**
   * Handler for "keyup"
   * @param {KeyboardEvent} event
   */
  onKeyUp($event) {
    switch ($event.code) {
      case "KeyW":
        this.input.z = 0;
        this.resetFov();
        break;
      case "KeyA":
        this.input.x = 0;
        break;
      case "KeyS":
        this.input.z = 0;
        break;
      case "KeyD":
        this.input.x = 0;
        break;
      case "Space":
        this.spaceDown = false;
        this.jumpHoldRemaining = 0;
        break;
      case "KeyR":
        this.position.set(32, 16, 32);
        this.velocity.set(0, 0, 0);
        break;
      case "KeyC":
        this.resetFov();
        break;
    }
  }

  /**
   * Selects the toolbar slot and updates the active block.
   * @param {number} slot
   */
  selectToolbarSlot(slot) {
    const previous = document.getElementById(`toolbar-${this.activeSlot}`);
    if (previous) previous.classList.remove("selected");

    this.activeSlot = slot;
    const blockId = this.toolbarSlots[slot - 1] ?? blocks.empty.id;
    this.activeBlockId = blockId;

    const next = document.getElementById(`toolbar-${this.activeSlot}`);
    if (next) next.classList.add("selected");

    this.tool.visible = this.activeBlockId === blocks.empty.id;
  }

  /**
   * Selects the next or previous toolbar slot.
   * @param {number} delta
   */
  cycleToolbarItem(delta) {
    let index = this.activeSlot - 1;
    index =
      (index + delta + this.toolbarSlots.length) % this.toolbarSlots.length;
    this.selectToolbarSlot(index + 1);
  }

  /**
   * Handler for mouse wheel events to cycle inventory.
   * @param {WheelEvent} event
   */
  onWheel(event) {
    if (!this.controls.isLocked) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    this.cycleToolbarItem(delta);
  }

  /**
   * Returns player position as a string
   * @return {string}
   */
  toString() {
    return `[X]: ${this.position.x.toFixed(2)}, [Y]: ${this.position.y.toFixed(2)}, [Z]: ${this.position.z.toFixed(2)}`;
  }
}
