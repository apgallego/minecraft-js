import * as THREE from "three";
import { WorldChunk } from "./worldChunk";
import { DataStore } from "./datastore";

export class World extends THREE.Group {
  asyncLoading = true; //for chunks

  // The number of chunks to render around the player.
  // If 0, only the chunk where the player is will be rendered.
  // If n > 0, adjacent chunks are rendered.
  drawDistance = 6;

  // Separate chunks visually for debugging purposes.
  chunkSpacing = 0;

  chunkSize = {
    width: 16,
    height: 32,
  };

  params = {
    seed: 0,
    terrain: {
      scale: 80,
      magnitude: 10,
      offset: 6,
      waterOffset: 3,
    },
    biomes: {
      scale: 200,
      variation: {
        amplitude: 0.2,
        scale: 50,
      },
      tundraToTemperate: 0.1,
      temperateToJungle: 0.5,
      jungleToDesert: 0.9,
      deserToTemperate: 1, //not needed
    },
    trees: {
      trunk: {
        minHeight: 4,
        maxHeight: 7,
      },
      canopy: {
        minRadius: 2,
        maxRadius: 4,
        density: 0.5, //Vary between 0.0 and 1.0
      },
      frequency: 0.01,
    },
    clouds: {
      scale: 30,
      density: 0,
    },
  };

  dataStore = new DataStore();
  player = null;

  constructor(seed = 0) {
    super();
    this.seed = seed;

    document.addEventListener("keydown", ($event) => {
      switch ($event.code) {
        case "KeyG":
          this.save();
          break;
        case "KeyL":
          this.load();
          break;
      }
    });
  }

  /**
   * Sets the player object for the world, allowing the world to access the player's position and other properties.
   * @param {*} player
   */
  setPlayer(player) {
    this.player = player;
  }

  /**
   * Saves the current world state to localStorage.
   */
  save() {
    localStorage.setItem("minecraft_params", JSON.stringify(this.params));
    localStorage.setItem("minecraft_data", JSON.stringify(this.dataStore.data));

    const playerPosition = this.player
      ? {
          x: this.player.position.x,
          y: this.player.position.y,
          z: this.player.position.z,
        }
      : null;
    localStorage.setItem("minecraft_player", JSON.stringify(playerPosition));

    document.getElementById("status").innerText = "World saved!";
    setTimeout(() => {
      document.getElementById("status").innerText = "";
    }, 3000);
  }

  /**
   * Loads the world state from localStorage.
   */
  load() {
    const savedParams = localStorage.getItem("minecraft_params");
    if (savedParams) {
      this.params = JSON.parse(savedParams);
    }

    const savedData = localStorage.getItem("minecraft_data");
    if (savedData) {
      this.dataStore.data = JSON.parse(savedData);
    }

    const savedPlayer = localStorage.getItem("minecraft_player");
    let playerPosition = null;
    if (savedPlayer) {
      playerPosition = JSON.parse(savedPlayer);
    }

    document.getElementById("status").innerText = "World loaded!";
    setTimeout(() => {
      document.getElementById("status").innerText = "";
    }, 3000);

    this.generate();

    if (this.player && playerPosition) {
      this.player.position.set(
        playerPosition.x,
        playerPosition.y,
        playerPosition.z,
      );
    }
  }

  generate(clearCache = false) {
    if (clearCache) {
      this.dataStore.clear();
    }
    this.disposeChunks();
    for (let x = -this.drawDistance; x <= this.drawDistance; x++) {
      for (let z = -this.drawDistance; z <= this.drawDistance; z++) {
        const chunk = new WorldChunk(
          this.chunkSize,
          this.params,
          this.dataStore,
        );
        chunk.position.set(
          x * (this.chunkSize.width + this.chunkSpacing),
          0,
          z * (this.chunkSize.width + this.chunkSpacing),
        );
        chunk.userData = { x, z };
        chunk.generate();
        this.add(chunk);
      }
    }
  }

  /**
   * Updates the visible portions of the world based on the current player position
   * @param {Player} player
   */
  update(player) {
    const visibleChunks = this.getVisibleChunks(player);
    const chunksToAdd = this.getChunksToAdd(visibleChunks);
    this.removeUnusedChunks(visibleChunks);

    for (const chunk of chunksToAdd) {
      this.generateChunk(chunk.x, chunk.z);
    }
  }

  /**
   * Returns an array containing the coordinates of the chunks that are currently visible to the player.
   * @param {Player} player
   * @returns {{ x: number, z: number}[]}
   */
  getVisibleChunks(player) {
    const visibleChunks = [];

    const coords = this.worldToChunkCoords(
      player.position.x,
      player.position.y,
      player.position.z,
    );

    const chunkX = coords.chunk.x;
    const chunkZ = coords.chunk.z;

    for (
      let x = chunkX - this.drawDistance;
      x <= chunkX + this.drawDistance;
      x++
    ) {
      for (
        let z = chunkZ - this.drawDistance;
        z <= chunkZ + this.drawDistance;
        z++
      ) {
        visibleChunks.push({ x, z });
      }
    }

    return visibleChunks;
  }

  /**
   * Returns an array containing the coordinates of the chunks that are not yet loaded and need to be added.
   * @param {{x: number, z: number}}
   * @return {{x: number, z: number}}
   */
  getChunksToAdd(visibleChunks) {
    return visibleChunks.filter((chunk) => {
      const chunkExists = this.children
        .map((obj) => obj.userData)
        .find(({ x, z }) => chunk.x === x && chunk.z === z);

      return !chunkExists;
    });
  }

  /**
   * Removes current loaded chunks that are no longer visible for the player
   * @param {{ x: number, z: number }}
   */
  removeUnusedChunks(visibleChunks) {
    const chunksToRemove = this.children.filter((chunk) => {
      const { x, z } = chunk.userData;
      const chunkExists = visibleChunks.find(
        (visibleChunk) => visibleChunk.x === x && visibleChunk.z === z,
      );

      return !chunkExists;
    });

    // Remove unused chunks.
    chunksToRemove.forEach((chunk) => {
      this.remove(chunk);
    });
  }

  /**
   * Generates the chunk at the x, z coordinates.
   * @param {number} x
   * @param {number} y
   */
  generateChunk(x, z) {
    const chunk = new WorldChunk(this.chunkSize, this.params, this.dataStore);
    chunk.position.set(
      x * (this.chunkSize.width + this.chunkSpacing),
      0,
      z * (this.chunkSize.width + this.chunkSpacing),
    );
    chunk.userData = { x, z };

    if (this.asyncLoading) {
      requestIdleCallback(chunk.generate.bind(chunk, { timeout: 1000 }));
    } else {
      chunk.generate();
    }
    this.add(chunk);
  }

  /**
   * Returns the coordinates of the block at world position (x, y, z).
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {{
   *  chunk: x: number, z: number,
   *  block: x: number, y: number, z: number
   * }}
   */
  worldToChunkCoords(x, y, z) {
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
  getChunk(chunkX, chunkZ) {
    return (
      this.children.find(
        (chunk) =>
          chunk.userData &&
          chunk.userData.x === chunkX &&
          chunk.userData.z === chunkZ,
      ) || null
    );
  }

  /**
   * Gets the block data at x, y, z.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {{ id: number, instanceId: number } | null}
   */
  getBlock(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk && chunk.loaded) {
      return chunk.getBlock(coords.block.x, coords.block.y, coords.block.z);
    } else {
      return null;
    }
  }

  disposeChunks() {
    this.traverse((chunk) => {
      if (chunk.disposeInstances) chunk.disposeInstances();
    });
    this.clear();
  }

  /**
   * Removes the block at x, y, z and sets it to empty.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */

  removeBlock(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk) {
      chunk.removeBlock(coords.block.x, coords.block.y, coords.block.z);
      // Reveal adjacent blocks if they are hidden.
      this.revealBlock(x - 1, y, z);
      this.revealBlock(x + 1, y, z);
      this.revealBlock(x, y - 1, z);
      this.revealBlock(x, y + 1, z);
      this.revealBlock(x, y, z - 1);
      this.revealBlock(x, y, z + 1);
    }
  }

  /**
   * Reveals the block at x, y, z by adding a new mesh instance.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  revealBlock(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk) {
      chunk.addBlockInstance(coords.block.x, coords.block.y, coords.block.z);
    }
  }

  /**
   * Adds a new block at x, y, z.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @param {number} blockId
   */
  addBlock(x, y, z, blockId) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (chunk) {
      chunk.addBlock(coords.block.x, coords.block.y, coords.block.z, blockId);
    }

    this.hideBlock(x - 1, y, z);
    this.hideBlock(x + 1, y, z);
    this.hideBlock(x, y - 1, z);
    this.hideBlock(x, y + 1, z);
    this.hideBlock(x, y, z - 1);
    this.hideBlock(x, y, z + 1);
  }

  /**
   * Hides the block at x, y, z by removing the mesh instance.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  hideBlock(x, y, z) {
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.z);

    if (
      chunk &&
      chunk.isBlockObscured(coords.block.x, coords.block.y, coords.block.z)
    ) {
      chunk.deleteBlockInstance(coords.block.x, coords.block.y, coords.block.z);
    }
  }
}
