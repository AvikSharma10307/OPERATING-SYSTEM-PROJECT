const BaseFileSystem = require('./BaseFileSystem');

class FAT32 extends BaseFileSystem {
    constructor() {
        super('FAT32');
        this.maxFileSize = 4 * 1024 * 1024 * 1024; // 4GB in bytes
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
        return super.writeFile(path, data);
    }
}

module.exports = FAT32;
