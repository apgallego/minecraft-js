import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player{
    radius = 0.5;
    height = 1.75;
    jumpSpeed = 10;
    onGround = false;
    maxSpeed = 10;
    input = new THREE.Vector3();
    velocity = new THREE.Vector3();
    // '#' is for private vars
    #worldVelocity = new THREE.Vector3();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
    controls = new PointerLockControls(this.camera, document.body);

    cameraHelper = new THREE.CameraHelper(this.camera);

    /**
     * @param {THREE.Scene} scene 
     */
    constructor(scene){
        this.position.set(32, 16, 32);
        scene.add(this.camera);
        
        //for debugging
        scene.add(this.cameraHelper);
        
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        
        //wireframe mesh visualizing the player's bounding cylinder (hitbox???)
        this.boundsHelper = new THREE.Mesh(
            new THREE.CylinderGeometry(this.radius, this.radius, this.height, 16),
            new THREE.MeshBasicMaterial() //{ wireframe: true }
        );
        scene.add(this.boundsHelper);
    }

    get worldVelocity(){
        this.#worldVelocity.copy(this.velocity);
        this.#worldVelocity.applyEuler(new THREE.Euler(0, this.camera.rotation.y, 0));
        return this.#worldVelocity;
    }

    /**
     * applies a change in velocity dv that is specified in the world frame
     * @param {THREE.Vector3} dv 
     */
    applyWorldDeltaVelocity(dv){
        dv.applyEuler(new THREE.Euler(0, -this.camera.rotation.y, 0));
        this.velocity.add(dv);
    }

    applyInputs(deltaTime){
        if(this.controls.isLocked){
            this.velocity.x = this.input.x;
            this.velocity.z = this.input.z;
            this.controls.moveRight(this.velocity.x * deltaTime);
            this.controls.moveForward(this.velocity.z * deltaTime);
            this.position.y += this.velocity.y * deltaTime;
        }

        document.getElementById('player-position').innerText = this.toString();
    }

    /**
     * Update the position of the player's bounding cylinder helper
     */
    updateBoundsHelper(){
        this.boundsHelper.position.copy(this.position);
        this.boundsHelper.position.y -= this.height / 2;
    }

    /**
     * Return the current position of the player
     * @type {THREE.Vector3}
     */
    get position(){
        return this.camera.position;
    }

    /**
     * Handler for "keydown"
     * @param {KeyboardEvent} event
     */
    onKeyDown($event){
        if(!this.controls.isLocked){
            this.controls.lock();
        }

        switch($event.code){
            case 'KeyW':
                this.input.z = this.maxSpeed;
                break;
            case 'KeyA':
                this.input.x = -this.maxSpeed;
                break;
            case 'KeyS':
                this.input.z = -this.maxSpeed;
                break;
            case 'KeyD':
                this.input.x = this.maxSpeed;
                break;
            case 'Space':
                if(this.onGround)
                    this.velocity.y += this.jumpSpeed;
                break;
        }
    }

    /**
     * Handler for "keyup"
     * @param {KeyboardEvent} event
     */
    onKeyUp($event){
        switch($event.code){
            case 'KeyW':
                this.input.z = 0;
                break;
            case 'KeyA':
                this.input.x = 0;
                break;
            case 'KeyS':
                this.input.z = 0;
                break;
            case 'KeyD':
                this.input.x = 0;
                break;
            case 'KeyR':
                this.position.set(32, 16, 32);
                this.velocity.set(0, 0, 0);
                break;
        }
    }

    /**
     * Returns player position as a string
     * @return {string}
     */
    toString(){
        return `[X]: ${this.position.x.toFixed(2)}, [Y]: ${this.position.y.toFixed(2)}, [Z]: ${this.position.z.toFixed(2)}`;
    }
}