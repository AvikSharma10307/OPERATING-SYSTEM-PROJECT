const FAT32 = require('./fs-types/FAT32');
const NTFS = require('./fs-types/NTFS');
const EXT4 = require('./fs-types/EXT4');

class VFSManager {
    constructor() {
        // Instantiate the core engines. They persist in memory.
        this.systems = {
            'FAT32': new FAT32(),
            'NTFS': new NTFS(),
            'EXT4': new EXT4()
        };
        this.activeFS = null;
        this.logs = []; // VFS Panel Logs
    }

    /**
     * Formats and stores the log entry, then returns the original result.
     * Log format requested: User Request -> VFS -> Selected File System -> Success/Error
     */
    _logOperation(requestName, result) {
        const fsName = this.activeFS ? this.activeFS.name : 'NONE';
        const status = result.success ? 'Success' : `Error (${result.error || 'Unknown Error'})`;
        const logEntry = `User Request -> VFS -> ${fsName} -> ${status}`;
        
        this.logs.push({
            timestamp: new Date().toISOString(),
            operation: requestName,
            log: logEntry,
            details: result
        });
        
        // Print to console for simulation verification
        console.log(`[VFS Panel] ${logEntry}`);
        
        return result;
    }

    _checkActive() {
        if (!this.activeFS) {
            return { success: false, error: 'No File System selected. Please select FAT32, NTFS, or EXT4.' };
        }
        return { success: true };
    }

    // --- Module Features ---

    // 1 & 2. Select / Switch Active File System
    switchFileSystem(type) {
        const uppercaseType = type.toUpperCase();
        if (this.systems[uppercaseType]) {
            this.activeFS = this.systems[uppercaseType];
            const result = { success: true, message: `Switched active file system to ${uppercaseType}` };
            return this._logOperation('switchFileSystem', result);
        }
        
        const result = { success: false, error: `File system type '${type}' is not supported.` };
        return this._logOperation('switchFileSystem', result);
    }

    getActiveFileSystem() {
        return this.activeFS ? this.activeFS.name : null;
    }

    async _simulateDelay() {
        if (!this.activeFS) return;
        const type = this.activeFS.name;
        let delay = 0;
        if (type === 'FAT32') delay = 300;
        else if (type === 'NTFS') delay = 150;
        else if (type === 'EXT4') delay = 50;

        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    async _errorMiddleware(operation, ...args) {
        if (!this.activeFS) return null;
        const fsType = this.activeFS.name;

        // FAT32: If file size > 4GB -> throw error
        if (fsType === 'FAT32' && operation === 'writeFile') {
            const data = args[1] || '';
            const simulatedSize = data.includes('SIMULATE_4GB_PLUS') ? (4 * 1024 * 1024 * 1024 + 1) : data.length;
            if (simulatedSize > 4 * 1024 * 1024 * 1024) {
                return { success: false, error: 'File size exceeds FAT32 limit (4GB)' };
            }
        }

        // NTFS: Add mock permission check: If user.role !== "admin" -> deny delete operation
        if (fsType === 'NTFS' && (operation === 'deleteFile' || operation === 'deleteFolder')) {
            const mockUser = { role: 'guest' }; // Simulated non-admin user
            if (mockUser.role !== 'admin') {
                return { success: false, error: 'NTFS Security: Access Denied. Admin role required to delete.' };
            }
        }

        // EXT4: Simulate inode limit: Max 50 files -> after that throw error
        if (fsType === 'EXT4' && (operation === 'createFile' || operation === 'createFolder')) {
            const countNodes = (node) => {
                let count = 0;
                if (node.children) {
                    for (const child of Object.values(node.children)) {
                        count++;
                        if (child.type === 'folder') count += countNodes(child);
                    }
                }
                return count;
            };
            const totalInodes = countNodes(this.activeFS.root);
            if (totalInodes >= 50) {
                return { success: false, error: 'EXT4 Error: Inode limit reached (Max 50 items)' };
            }
        }

        return null; // Proceed normally if no rules matched
    }

    // 3. Route Commands

    async createFile(path) {
        await this._simulateDelay();
        const check = this._checkActive();
        if (!check.success) return this._logOperation('createFile', check);
        const err = await this._errorMiddleware('createFile', path);
        if (err) return this._logOperation('createFile', err);
        return this._logOperation('createFile', this.activeFS.createFile(path));
    }

    async deleteFile(path) {
        await this._simulateDelay();
        const check = this._checkActive();
        if (!check.success) return this._logOperation('deleteFile', check);
        const err = await this._errorMiddleware('deleteFile', path);
        if (err) return this._logOperation('deleteFile', err);
        return this._logOperation('deleteFile', this.activeFS.deleteFile(path));
    }

    async readFile(path) {
        await this._simulateDelay();
        const check = this._checkActive();
        if (!check.success) return this._logOperation('readFile', check);
        return this._logOperation('readFile', this.activeFS.readFile(path));
    }

    async writeFile(path, data) {
        await this._simulateDelay();
        const check = this._checkActive();
        if (!check.success) return this._logOperation('writeFile', check);
        const err = await this._errorMiddleware('writeFile', path, data);
        if (err) return this._logOperation('writeFile', err);
        return this._logOperation('writeFile', this.activeFS.writeFile(path, data));
    }

    async renameFile(oldPath, newName) {
        await this._simulateDelay();
        const check = this._checkActive();
        if (!check.success) return this._logOperation('renameFile', check);
        return this._logOperation('renameFile', this.activeFS.renameFile(oldPath, newName));
    }

    async createFolder(path) {
        await this._simulateDelay();
        const check = this._checkActive();
        if (!check.success) return this._logOperation('createFolder', check);
        const err = await this._errorMiddleware('createFolder', path);
        if (err) return this._logOperation('createFolder', err);
        return this._logOperation('createFolder', this.activeFS.createFolder(path));
    }

    async deleteFolder(path) {
        await this._simulateDelay();
        const check = this._checkActive();
        if (!check.success) return this._logOperation('deleteFolder', check);
        const err = await this._errorMiddleware('deleteFolder', path);
        if (err) return this._logOperation('deleteFolder', err);
        return this._logOperation('deleteFolder', this.activeFS.deleteFolder(path));
    }

    async listItems(path = '/') {
        await this._simulateDelay();
        const check = this._checkActive();
        if (!check.success) return this._logOperation('listItems', check);
        return this._logOperation('listItems', this.activeFS.listItems(path));
    }

    async statItem(path) {
        await this._simulateDelay();
        const check = this._checkActive();
        if (!check.success) return this._logOperation('statItem', check);
        return this._logOperation('statItem', this.activeFS.statItem(path));
    }
    
    // 4. Logs panel output fetcher
    getVFSLogs() {
        return this.logs;
    }
    
    // Custom wrapper to access specific FS features (like changing NTFS user)
    async executeSpecialFeature(featureName, ...args) {
        await this._simulateDelay();
        const check = this._checkActive();
        if (!check.success) return this._logOperation(`special:${featureName}`, check);
        
        if (typeof this.activeFS[featureName] === 'function') {
            const result = this.activeFS[featureName](...args);
            return this._logOperation(`special:${featureName}`, result);
        } else {
             return this._logOperation(`special:${featureName}`, { success: false, error: `${featureName} is not supported on ${this.activeFS.name}` });
        }
    }
}

module.exports = VFSManager;
