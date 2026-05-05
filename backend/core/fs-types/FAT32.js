const BaseFileSystem = require('./BaseFileSystem');
const BlockAllocator = require('../BlockAllocator');

// FAT32-specific behavior and file size simulation
class FAT32 extends BaseFileSystem {
    constructor() {
        super('FAT32');
        this.maxFileSize = 4 * 1024 * 1024 * 1024; // 4GB in bytes
    }

    createFile(path) {
        const result = super.createFile(path);
        if (result.success) {
            // Attach initial block allocation (empty file = 1 block minimum)
            const resolved = this._resolvePath(path);
            const file = resolved.parent.children[resolved.targetName];
            file.blocks = BlockAllocator.allocateBlocks(1, 'FAT32');
        }
        return result;
    }

    writeFile(path, data) {
        // FAT32 Special Behavior: 4GB file size limit warning
        // Simulate data size (1 char = 1 byte). 
        // For testing purposes, if data contains a special keyword, we fake a massive size.
        let simulatedSize = data.length;
        if (data.includes('SIMULATE_4GB_PLUS')) {
            simulatedSize = this.maxFileSize + 1; 
        }

        if (simulatedSize > this.maxFileSize) {
            return { 
                success: false, 
                error: `FAT32 System Error: File size exceeds the 4GB limit. Cannot write ${simulatedSize} bytes.` 
            };
        }

        // Call the parent class's writeFile if within limits
        const result = super.writeFile(path, data);

        // Re-allocate blocks based on new data size
        if (result.success) {
            const resolved = this._resolvePath(path);
            const file = resolved.parent.children[resolved.targetName];
            file.blocks = BlockAllocator.allocateBlocks(data.length, 'FAT32');
        }

        return result;
    }
}

module.exports = FAT32;
