const BaseFileSystem = require('./BaseFileSystem');

class NTFS extends BaseFileSystem {
    constructor() {
        super('NTFS');
        this.journal = []; // Transaction logs
        this.currentUser = 'admin'; // Basic simulated permissions
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
        if (this.currentUser === 'guest') {
            this._logJournal('DELETE_DENIED', path, 'Permission Denied: User is guest');
            return { success: false, error: 'NTFS Security: Permission denied for user guest' };
        }

        const result = super.deleteFile(path);
        if (result.success) {
            this._logJournal('DELETE', path, 'Success');
        } else {
            this._logJournal('DELETE_FAILED', path, result.error);
        }
        return result;
    }

    createFile(path) {
        const result = super.createFile(path);
        this._logJournal('CREATE_FILE', path, result.success ? 'Success' : result.error);
        return result;
    }

    writeFile(path, data) {
        // Log the state before write for journaling concept
        const readResult = this.readFile(path);
        const oldSize = readResult.success ? readResult.data.length : 0;
        
        const result = super.writeFile(path, data);
        
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
    switchUser(username) {
        this.currentUser = username;
        return { success: true, message: `User switched to ${username}` };
    }
}

module.exports = NTFS;
