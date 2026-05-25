import * as THREE from 'three';
import { sin } from 'three/tsl';

export class Tool extends THREE.Group {
    animate = false;
    animationAmplitude = 0.5;
    animationDuration = 1.0;
    animationStart = 0;
    animationSpeed = 0.025;
    animation = undefined;
    toolMesh = undefined;

    get animationTime(){
        return performance.now() - this.animationStart;
    }

    startAnimation(){
        this.animate = true;
        this.animationStart = performance.now();

        //stop existing animation
        clearTimeout(this.animate);

        //set a timer to stop the animation after a specified duration
        this.animation = setTimeout( () => {
            this.animate = false;
        }, this.animationDuration);
    }

    /**
     * Updates the tool animation state
     */
    update(){
        if(this.animate && this.toolMesh){
            //oscillates the tool back and forth
            this.toolMesh.rotation.y = this.animationAmplitude * sin(this.animationTime * this.animationSpeed);
        }
    }

    /**
     * Sets the active tool mesh
     * @param {THREE.Mesh} mesh
     */
    setMesh(mesh){
        this.clear();

        this.toolMesh = mesh;
        this.add(this.toolMesh);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        
        this.position.set(1, -1, -1.5);
        this.scale.set(0.05, 0.05, 0.05);
        this.rotation.z = Math.PI / 3;
        this.rotation.y = Math.PI + 2;
    }
}