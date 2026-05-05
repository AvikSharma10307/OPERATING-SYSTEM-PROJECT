const BaseFileSystem = require('./BaseFileSystem');
const BlockAllocator = require('../BlockAllocator');

// NTFS-specific behavior including journaling and permissions
class NTFS extends BaseFileSystem {
    constructor() {
        super('NTFS');
        this.journal = []; // Transaction logs
        this.currentUser = 'admin'; // Basic simulated permissions
        this.userRole = 'admin';    // Role-based access control
    }

    _logJournal(action, path, details) {
        this.journal.push({
            timestamp: new Date().toISOString(),
            user: this.currentUser,
            action,
            path,
            details
        });
    }

    // Special Behavior: Simulated permissions check
    deleteFile(path) {
        if (this.userRole !== 'admin') {
            this._logJournal('DELETE_DENIED', path, `Permission Denied: User '${this.currentUser}' (role: ${this.userRole}) cannot delete files`);
            return { success: false, error: `NTFS Security: Permission denied. Role '${this.userRole}' cannot delete files. Admin access required.` };
        }

        const result = super.deleteFile(path);
        if (result.success) {
            this._logJournal('DELETE', path, 'Success');
        } else {
            this._logJournal('DELETE_FAILED', path, result.error);
        }
        return result;
    }

    deleteFolder(path) {
        if (this.userRole !== 'admin') {
            this._logJournal('DELETE_FOLDER_DENIED', path, `Permission Denied: User '${this.currentUser}' (role: ${this.userRole}) cannot delete folders`);
            return { success: false, error: `NTFS Security: Permission denied. Role '${this.userRole}' cannot delete folders. Admin access required.` };
        }

        const result = super.deleteFolder(path);
        if (result.success) {
            this._logJournal('DELETE_FOLDER', path, 'Success');
        } else {
            this._logJournal('DELETE_FOLDER_FAILED', path, result.error);
        }
        return result;
    }

    createFile(path) {
        const result = super.createFile(path);
        if (result.success) {
            const resolved = this._resolvePath(path);
            const file = resolved.parent.children[resolved.targetName];
            file.blocks = BlockAllocator.allocateBlocks(1, 'NTFS');
        }
        this._logJournal('CREATE_FILE', path, result.success ? 'Success' : result.error);
        return result;
    }

    writeFile(path, data) {
        // Non-admin users can only read, not write
        if (this.userRole !== 'admin' && this.userRole !== 'editor') {
            this._logJournal('WRITE_DENIED', path, `Permission Denied: User '${this.currentUser}' (role: ${this.userRole}) cannot write files`);
            return { success: false, error: `NTFS Security: Permission denied. Role '${this.userRole}' cannot write files. Admin or editor access required.` };
        }

        // Log the state before write for journaling concept
        const readResult = this.readFile(path);
        const oldSize = readResult.success ? readResult.data.length : 0;
        
        const result = super.writeFile(path, data);
        
        // Re-allocate blocks based on new data size
        if (result.success) {
            const resolved = this._resolvePath(path);
            const file = resolved.parent.children[resolved.targetName];
            file.blocks = BlockAllocator.allocateBlocks(data.length, 'NTFS');
        }

        this._logJournal(
            'WRITE', 
            path, 
            result.success ? `Success (Size change: ${oldSize}b -> ${data.length}b)` : result.error
        );
        return result;
    }
    
    // Method to read the journal for UI analytics
    getJournalLogs() {
        return { success: true, logs: this.journal };
    }

    // Method to simulate permission context changes
    switchUser(username, role = 'viewer') {
        this.currentUser = username;
        this.userRole = role;
        return { success: true, message: `User switched to '${username}' with role '${role}'` };
    }
}

module.exports = NTFS;
