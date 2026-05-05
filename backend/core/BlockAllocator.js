/**
 * BlockAllocator — Simulates how different file systems allocate disk blocks.
 * 
 * Each file system uses a different allocation strategy:
 *   FAT32 → Linked allocation (sequential chain of blocks)
 *   NTFS  → Hybrid allocation (mix of contiguous runs + scattered blocks)
 *   EXT4  → Indexed allocation (grouped contiguous extents)
 * 
 * Block numbers range from 1–100, simulating a small virtual disk.
 * Block size is 512 bytes (simulated).
 */

const BLOCK_SIZE = 512;     // Each block = 512 bytes (simulated)
const MAX_BLOCK = 100;      // Virtual disk has blocks numbered 1–100

class BlockAllocator {

    /**
     * Main entry point. Returns an array of allocated block numbers
     * based on the file system type and data size.
     * 
     * @param {number} fileSize - Size of file data in bytes (characters)
     * @param {string} fsType   - 'FAT32', 'NTFS', or 'EXT4'
     * @returns {number[]}      - Array of allocated block numbers
     */
    static allocateBlocks(fileSize, fsType) {
        const blockCount = Math.max(1, Math.ceil(fileSize / BLOCK_SIZE));
        
        let blocks;
        switch (fsType.toUpperCase()) {
            case 'FAT32':
                blocks = BlockAllocator._linkedAllocation(blockCount);
                break;
            case 'NTFS':
                blocks = BlockAllocator._hybridAllocation(blockCount);
                break;
            case 'EXT4':
                blocks = BlockAllocator._indexedAllocation(blockCount);
                break;
            default:
                blocks = BlockAllocator._linkedAllocation(blockCount);
        }

        console.log(`[BlockAllocator] ${fsType} allocated ${blockCount} block(s): [${blocks.join(', ')}]`);
        return blocks;
    }

    /**
     * FAT32 — Linked Allocation
     * Blocks form a sequential chain starting from a random position.
     * Simulates the FAT linked-list approach where each block points to the next.
     * Can wrap around if it reaches the end of the disk.
     */
    static _linkedAllocation(blockCount) {
        const start = BlockAllocator._randomInt(1, MAX_BLOCK - blockCount + 1);
        const blocks = [];
        for (let i = 0; i < blockCount; i++) {
            blocks.push(((start + i - 1) % MAX_BLOCK) + 1);
        }
        return blocks;
    }

    /**
     * NTFS — Hybrid Allocation
     * Uses a mix strategy: first half as a contiguous run,
     * remaining blocks scattered randomly across the disk.
     * Simulates NTFS's MFT resident + non-resident data runs.
     */
    static _hybridAllocation(blockCount) {
        const blocks = [];
        const contiguousCount = Math.max(1, Math.ceil(blockCount / 2));
        const scatteredCount = blockCount - contiguousCount;

        // Contiguous run starting at a random position
        const runStart = BlockAllocator._randomInt(1, MAX_BLOCK - contiguousCount + 1);
        for (let i = 0; i < contiguousCount; i++) {
            blocks.push(runStart + i);
        }

        // Scattered blocks (random, non-overlapping)
        const usedSet = new Set(blocks);
        let attempts = 0;
        while (blocks.length < blockCount && attempts < 500) {
            const rand = BlockAllocator._randomInt(1, MAX_BLOCK);
            if (!usedSet.has(rand)) {
                usedSet.add(rand);
                blocks.push(rand);
            }
            attempts++;
        }

        return blocks;
    }

    /**
     * EXT4 — Indexed Allocation (Extent-Based)
     * Allocates blocks in contiguous groups (extents).
     * Each extent is a small contiguous chunk, with gaps between extents.
     * Simulates EXT4's extent tree for efficient large-file storage.
     */
    static _indexedAllocation(blockCount) {
        const blocks = [];
        const extentSize = Math.max(1, Math.min(4, blockCount)); // 1–4 blocks per extent
        let remaining = blockCount;
        const usedSet = new Set();

        while (remaining > 0) {
            const chunkSize = Math.min(extentSize, remaining);
            let extentStart;
            let valid = false;
            let attempts = 0;

            // Find a non-overlapping contiguous region
            while (!valid && attempts < 200) {
                extentStart = BlockAllocator._randomInt(1, MAX_BLOCK - chunkSize + 1);
                valid = true;
                for (let i = 0; i < chunkSize; i++) {
                    if (usedSet.has(extentStart + i)) {
                        valid = false;
                        break;
                    }
                }
                attempts++;
            }

            // Allocate the extent
            for (let i = 0; i < chunkSize; i++) {
                const blk = extentStart + i;
                blocks.push(blk);
                usedSet.add(blk);
            }

            remaining -= chunkSize;
        }

        return blocks;
    }

    /**
     * Helper: random integer in [min, max] inclusive.
     */
    static _randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

module.exports = BlockAllocator;
