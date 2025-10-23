import * as THREE from 'three';
import { blocks } from './blocks.js'

const collisionMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.2
});
const collisionGeometry = new THREE.BoxGeometry(1.001, 1.001, 1.001);

export class Physics {
    constructor(scene){
        this.helpers = new THREE.Group();
        scene.add(this.helpers);
    }

    /**
     * Moves the physics simulation forward in ttime by 'deltaTime'
     * @param {number} deltaTime
     * @param {Player} player
     * @param {World} world
     */
    update(deltaTime, player, world){
        this.detectCollisions(player, world);
    }

    /**
     * Possible blocks the player may be colliding with
     * @param {Player} player
     * @param {World} world
     * @return {[]}
     */
    broadPhase(player, world){
        const candidates = [];
        this.helpers.clear();

        //Get the extents of the player
        const extents = {
            x: {
                min: Math.floor(player.position.x - player.radius),
                max: Math.ceil(player.position.x + player.radius)
            },
            y: {
                min: Math.floor(player.position.y - player.height),
                max: Math.ceil(player.position.y)
            },
            z: {
                min: Math.floor(player.position.z - player.radius),
                max: Math.ceil(player.position.z + player.radius) 
            }           
        };

        //Loop through all blocks within the player's extents
        //If they aren't empty, then they are possible collision candidates
        for(let x = extents.x.min; x <= extents.x.max; x++){
            for(let y = extents.y.min; y <= extents.y.max; y++){
                for(let z = extents.z.min; z <= extents.z.max; z++){
                    const block = world.getBlock(x, y, z);
                    if(block && block.id !== blocks.empty.id){
                        const blockPosition = {x, y, z};
                        candidates.push(blockPosition);
                        this.addCollisionHelper(blockPosition);
                    }
                }
            }
        }

        console.log("Broadphase Candidates" + candidates.length);

        return candidates;
    }

    /**
     * Main function for collision detection
     * @param {Player} player
     * @param {World} world
     */
    detectCollisions(player, world){
        const collisions = this.broadPhase(player, world);
        // const candidates = this.broadPhase(player, world);
        // const collisions = this.narrowPhase(candidates, player);
        
        // if(collisions.length > 0){
        //     this.resolveCollisions(collisions);
        // }
    }

    /**
     * Marks the block that the player is colliding with
     * @param {THREE.Object3D} block
     */
    addCollisionHelper(block){
        const blockMesh = new THREE.Mesh(collisionGeometry, collisionMaterial);
        blockMesh.position.copy(block);
        this.helpers.add(blockMesh);
    }

    
}