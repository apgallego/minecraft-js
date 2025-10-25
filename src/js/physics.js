import * as THREE from 'three';
import { blocks } from './blocks.js'

const collisionMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.2
});
const collisionGeometry = new THREE.BoxGeometry(1.001, 1.001, 1.001);

const contactMaterial = new THREE.MeshBasicMaterial({
    wireframe: true,
    color: 0x00ff00
});
const contactGeometry = new THREE.SphereGeometry(0.05, 6, 6);

export class Physics {
    gravity = 32;

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
        this.helpers.clear();
        player.velocity.y -= this.gravity * deltaTime;
        player.applyInputs(deltaTime);
        player.updateBoundsHelper();
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
     * Narrows down the blocks found in the broadphase to set the exact blocks that collide
     * 
     */
    narrowPhase(candidates, player){
        const collisions = [];
        for(const block of candidates){
            //get the point of the block that is the closest to the center of the player's bounding cylinder
            const p = player.position;
            const closestPoint = {
                x: Math.max(block.x - 0.5, Math.min(p.x, block.x + 0.5)),
                y: Math.max(block.y - 0.5, Math.min(p.y - (player.height / 2), block.y + 0.5)),
                z: Math.max(block.z - 0.5, Math.min(p.z, block.z + 0.5)),
            };

            //determine if point is inside player's bounding cylinder
            const dx = closestPoint.x - player.position.x;
            const dy = closestPoint.y - (player.position.y - (player.height / 2));
            const dz = closestPoint.z - player.position.z;

            if(this.pointInPlayerBoundingCylinder(closestPoint, player)){
                //compute the overlap between the point and the player's bounding cylinder along the y axis and xz plane
                const overlapY = (player.height / 2) - Math.abs(dy);
                const overlapXZ = player.radius - Math.sqrt(dx * dx + dz * dz);

                //compute the normal of the collision (pointing away from the contact point)
                //and the overlap between the point and the player's bounding cylinder
                let normal, overlap;
                if(overlapY < overlapXZ){
                    normal = new THREE.Vector3(0, -Math.sign(dy), 0);
                    overlap = overlapY;
                } else {
                    normal = new THREE.Vector3(-dx, 0, -dz).normalize();
                    overlap = overlapXZ;
                }

                collisions.push({
                    block,
                    contactPoint: closestPoint,
                    normal,
                    overlap
                });

                this.addContactPointHelper(closestPoint);
            }
        }

        console.log('Narrow Collisions: ' + collisions.length);

        return collisions;
    }

    /**
     * Main function for collision detection
     * @param {Player} player
     * @param {World} world
     */
    detectCollisions(player, world){
        const candidates = this.broadPhase(player, world);
        const collisions = this.narrowPhase(candidates, player);
        
        if(collisions.length > 0){
            this.resolveCollisions(collisions, player);
        }
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

    /**
     * Visualizes the contact point at the point p
     * @param {{ x, y, z }} p
     */
    addContactPointHelper(p){
        const contactMesh = new THREE.Mesh(contactGeometry, contactMaterial);
        contactMesh.position.copy(p);
        this.helpers.add(contactMesh);
    }

    /**
     * Returns true if the point p is inside the player's bounding cylinder
     * @param {{ x: number, y: number, z: number }} p
     * @param {Player} player 
     * @return {boolean}
     */
    pointInPlayerBoundingCylinder(p, player){
        const dx = p.x - player.position.x;
        const dy = p.y - (player.position.y - (player.height / 2));
        const dz = p.z - player.position.z;
        const r_sq = dx * dx + dz * dz;

        //check if contact point is inside the player's bounding cylinder
        return (Math.abs(dy) < player.height / 2) && (r_sq < player.radius * player.radius);
    }

    /**
     * resolves each of the collisions found in the narrow phase
     * @param {object} collisions 
     * @param {Player} player 
     */
    resolveCollisions(collisions, player){
        collisions.sort((a, b) => {
            return a.overlap < b.overlap;
        });

        for(const collision of collisions){
            // we adjust the player's position so the block and player do not overlap
            let deltaPosition = collision.normal.clone();
            deltaPosition.multiplyScalar(collision.overlap);
            player.position.add(deltaPosition);

            //we negate player's velocity along the collision normal
            let magnitude = player.worldVelocity.dot(collision.normal);
            let velocityAdjustment = collision.normal.clone().multiplyScalar(magnitude);

            player.applyWorldDeltaVelocity(velocityAdjustment.negate());
        }
    }
    
}