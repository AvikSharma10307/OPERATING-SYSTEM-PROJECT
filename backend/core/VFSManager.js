const FAT32 = require('./fs-types/FAT32');
const NTFS = require('./fs-types/NTFS');
const EXT4 = require('./fs-types/EXT4');

// VFSManager coordinates file system operations and logging
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

        // Performance simulation: artificial latency per file system type (ms)
        this.latencyMap = {
            'FAT32': 300,
            'NTFS':  150,
            'EXT4':   50
        };
    }

    /**
     * Returns the simulated latency in ms for the currently active file system.
     */
    _simulateLatency() {
        if (!this.activeFS) return 0;
        return this.latencyMap[this.activeFS.name] || 0;
    }

    /**
     * Wraps a synchronous operation with an artificial delay to simulate
     * real-world file system performance differences.
     * The original operation runs AFTER the delay completes.
     */
    async _performWithDelay(operationName, operationFn) {
        const delay = this._simulateLatency();
        const startTime = Date.now();

        // Non-blocking delay using Promise + setTimeout
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Execute the original operation (untouched logic)
        const result = operationFn();
        const elapsed = Date.now() - startTime;

        // Attach performance metadata to the result
        result._perf = {
            fsType: this.activeFS ? this.activeFS.name : 'NONE',
            simulatedDelayMs: delay,
            actualElapsedMs: elapsed
        };

        return this._logOperation(operationName, result);
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

    // 3. Route Commands

    createFile(path) {
        const check = this._checkActive();
        if (!check.success) return this._logOperation('createFile', check);
        return this._logOperation('createFile', this.activeFS.createFile(path));
    }

    async deleteFile(path) {
        const check = this._checkActive();
        if (!check.success) return this._logOperation('deleteFile', check);
        return this._performWithDelay('deleteFile', () => this.activeFS.deleteFile(path));
    }

    async readFile(path) {
        const check = this._checkActive();
        if (!check.success) return this._logOperation('readFile', check);
        return this._performWithDelay('readFile', () => this.activeFS.readFile(path));
    }

    async writeFile(path, data) {
        const check = this._checkActive();
        if (!check.success) return this._logOperation('writeFile', check);
        return this._performWithDelay('writeFile', () => this.activeFS.writeFile(path, data));
    }

    renameFile(oldPath, newName) {
        const check = this._checkActive();
        if (!check.success) return this._logOperation('renameFile', check);
        return this._logOperation('renameFile', this.activeFS.renameFile(oldPath, newName));
    }

    createFolder(path) {
        const check = this._checkActive();
        if (!check.success) return this._logOperation('createFolder', check);
        return this._logOperation('createFolder', this.activeFS.createFolder(path));
    }

    async deleteFolder(path) {
        const check = this._checkActive();
        if (!check.success) return this._logOperation('deleteFolder', check);
        return this._performWithDelay('deleteFolder', () => this.activeFS.deleteFolder(path));
    }

    listItems(path = '/') {
        const check = this._checkActive();
        if (!check.success) return this._logOperation('listItems', check);
        return this._logOperation('listItems', this.activeFS.listItems(path));
    }
    
    // 4. Logs panel output fetcher
    getVFSLogs() {
        return this.logs;
    }
    
    // Custom wrapper to access specific FS features (like changing NTFS user)
    executeSpecialFeature(featureName, ...args) {
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
