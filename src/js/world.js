import * as THREE from 'three';
import { WorldChunk } from './worldChunk';

export class World extends THREE.Group {

    asyncLoading = true; //for chunks

    //the number of chunks to render around the player
    //if 0, only renders the chunk where the player is
    //if n > 0, adjacent chunks are rendered
    drawDistance = 1;
    
    //to separate chunks in case of debugging visually
    chunkSpacing = 0;

    chunkSize = {
        width: 64,
        height: 32
    };

    params = {
        seed: 0,
        terrain: {
            scale: 30,
            magnitude: 0.5,
            offset: 0.2
        }
    };

    constructor(seed = 0){
        super();
        this.seed = seed;
    }

    generate(){
        this.disposeChunks();
        for(let x = -this.drawDistance; x <= this.drawDistance; x++ ){
            for(let z = -this.drawDistance; z <= this.drawDistance; z++ ){
                const chunk = new WorldChunk(this.chunkSize, this.params);
                chunk.position.set(
                    x * (this.chunkSize.width + this.chunkSpacing),
                    0,
                    z * (this.chunkSize.width + this.chunkSpacing)
                );
                chunk.userData = {x, z};
                chunk.generate();
                this.add(chunk);
            }
        }
    }

    /**
     * Updates the visible portions of the world based on the current player position
     * @param {Player} player
     */
    update(player){
        const visibleChunks = this.getVisibleChunks(player);
        const chunksToAdd = this.getChunksToAdd(visibleChunks);
        this.removeUnusedChunks(visibleChunks);

        for(const chunk of chunksToAdd){
            this.generateChunk(chunk.x,chunk.z);
        }
    }

    /**
     * Returns an array contaiing the coordinates of the chunks that are currently visible to the player
     * @param {Player} player
     * @returns {{ x: number, z: number}[]}
     */
    getVisibleChunks(player){
        const visibleChunks = [];

        const coords = this.worldToChunkCoords(
            player.position.x,
            player.position.y,
            player.position.z,
        );

        const chunkX = coords.chunk.x;
        const chunkZ = coords.chunk.z;

        for(let x = chunkX - this.drawDistance; x <= chunkX + this.drawDistance; x++){
            for(let z = chunkZ - this.drawDistance; z <= chunkZ + this.drawDistance; z++){
                visibleChunks.push({x, z });
            }
        }

        return visibleChunks;
    }

    /**
     * Returns an array containing the coordinates of the chunks that are not yet loaded and need to be adedd
     * @param {{x: number, z: number}}
     * @return {{x: number, z: number}}
     */
    getChunksToAdd(visibleChunks){
        return visibleChunks.filter(chunk => {
            const chunkExists = this.children
                .map(obj => obj.userData)
                .find(({x, z}) => chunk.x === x && chunk.z === z);

            return !chunkExists;
        });
    }

    /**
     * Removes current loaded chunks that are no longer visible for the player
     * @param {{ x: number, z: number }}
     */
    removeUnusedChunks(visibleChunks){
        const chunksToRemove = this.children.filter(chunk => {
            const { x, z} = chunk.userData;
            const chunkExists = visibleChunks
                .find((visibleChunk) => visibleChunk.x === x && visibleChunk.z === z);

            return !chunkExists;
        });

        // Eliminar los chunks no usados
        chunksToRemove.forEach(chunk => {
            this.remove(chunk);
        });
    }

    /**
     * Generates the chunk at teh x, z coordinates
     * @param {number} x
     * @param {number} y
     */
    generateChunk(x, z){
        const chunk = new WorldChunk(this.chunkSize, this.params);
        chunk.position.set(
            x * (this.chunkSize.width + this.chunkSpacing),
            0,
            z * (this.chunkSize.width + this.chunkSpacing)
        );
        chunk.userData = {x, z};

        if(this.asyncLoading){
            requestIdleCallback(chunk.generate.bind(chunk, {timeout: 1000}));
        } else {
            chunk.generate();
        }
        this.add(chunk);
    }

    /**
     * Returns the coordinates of the block at world (x, y z)
     * @param {number} x 
     * @param {number} y 
     * @param {number} z
     * @returns {{
     *  chunk: x: number, z: number,
     *  block: x: number, y: number, z: number
     * }}
     */
    worldToChunkCoords(x, y, z){
        const chunkCoords = {
            x: Math.floor(x / this.chunkSize.width),
            z: Math.floor(z / this.chunkSize.width),
        };

        const blockCoords = {
            x: x - this.chunkSize.width * chunkCoords.x,
            y,
            z: z - this.chunkSize.width * chunkCoords.z,
        };

        return {
            chunk: chunkCoords,
            block: blockCoords,
        };
    }

    /**
     * Returns the WorldChunk obj at the specified coordinates
     * @param {number} chunkX 
     * @param {number} chunkZ
     * @returns {WorldChunk | null}
     */
    getChunk(chunkX, chunkZ){
        return this.children.find(chunk =>
            chunk.userData &&
            chunk.userData.x === chunkX &&
            chunk.userData.z === chunkZ
        ) || null;
    }

    /**
     * Gets the block data at x, y,z 
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @returns {{ id: number, instanceId: number } | null}
     */
    getBlock(x, y, z){
        const coords = this.worldToChunkCoords(x, y, z);
        const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

        if(chunk && chunk.loaded){
            return chunk.getBlock(
                coords.block.x,
                coords.block.y,
                coords.block.z
            );
        } else {
            return null;
        }
    }

    disposeChunks(){
        this.traverse(chunk => {
            if(chunk.disposeInstances) chunk.disposeInstances();
        });
        this.clear();
    }

    /**
     * Removes the block at x, y, z and sets it to empty
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */

    removeBlock(x, y ,z){
        const coords = this.worldToChunkCoords(x, y , z);
        const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

        if(chunk){
            chunk.removeBlock(
                coords.block.x,
                coords.block.y,
                coords.block.z
            );
            //reveal adjacent blocks if hidden
            this.revealBlock(x - 1, y, z);
            this.revealBlock(x + 1, y, z);
            this.revealBlock(x, y - 1, z);
            this.revealBlock(x, y + 1, z);
            this.revealBlock(x, y, z - 1);
            this.revealBlock(x, y, z + 1);
        }
    }

    /**
     * Reveals the block at x, y, z by adding a new mesh instance
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    revealBlock(x, y, z){
        const coords = this.worldToChunkCoords(x, y, z);
        const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

        if(chunk){
            chunk.addBlockInstance(
                coords.block.x,
                coords.block.y,
                coords.block.z
            );
        }
    }
}