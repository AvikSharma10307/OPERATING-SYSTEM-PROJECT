const BaseFileSystem = require('./BaseFileSystem');

class EXT4 extends BaseFileSystem {
    constructor() {
        super('EXT4');
        // Simulate inode table for O(1) lookups
        this.inodeTable = new Map();
        this.nextInode = 1;
        
        // Add root folder to inode table
        this.root.inode = this.nextInode++;
        this.inodeTable.set(this.root.inode, this.root);
    }

    createFile(path) {
        const result = super.createFile(path);
        if (result.success) {
            // Get the newly created file and assign an inode
            const resolved = this._resolvePath(path);
            const file = resolved.parent.children[resolved.targetName];
            
            file.inode = this.nextInode++;
            this.inodeTable.set(file.inode, file);
        }
        return result;
    }

    createFolder(path) {
        const result = super.createFolder(path);
        if (result.success) {
            const resolved = this._resolvePath(path);
            const folder = resolved.parent.children[resolved.targetName];
            
            folder.inode = this.nextInode++;
            this.inodeTable.set(folder.inode, folder);
        }
        return result;
    }

    deleteFile(path) {
        const resolved = this._resolvePath(path);
        let inodeToDelete = null;
        
        if (resolved && !resolved.isRoot) {
            const file = resolved.parent.children[resolved.targetName];
            if (file && file.type === 'file') {
                inodeToDelete = file.inode;
            }
        }
        
        const result = super.deleteFile(path);
        
        // Fast cleanup of inode table if delete was successful
        if (result.success && inodeToDelete) {
            this.inodeTable.delete(inodeToDelete); 
        }
        
        return result;
    }
    
    deleteFolder(path) {
         const resolved = this._resolvePath(path);
        let inodeToDelete = null;
        
        if (resolved && !resolved.isRoot) {
            const folder = resolved.parent.children[resolved.targetName];
            if (folder && folder.type === 'folder') {
                inodeToDelete = folder.inode;
            }
        }
        
        const result = super.deleteFolder(path);
        
        if (result.success && inodeToDelete) {
            // Note: A true filesystem would recursively delete child inodes here.
            // For simple simulation, we just delete the folder's inode.
            this.inodeTable.delete(inodeToDelete); 
        }
        
        return result;
    }

    // Special Behavior: Fast lookup method directly by inode
    fastLookupByInode(inodeNumber) {
        if (this.inodeTable.has(inodeNumber)) {
            const item = this.inodeTable.get(inodeNumber);
            return { 
                success: true, 
                message: `Fast Lookup Success: Found ${item.type} '${item.name}'`,
                data: item 
            };
        }
        return { success: false, error: 'EXT4 Fast Lookup: Inode not found' };
    }

    // System stats method
    getInodeStats() {
        return { 
            success: true, 
            totalInodesUsed: this.inodeTable.size,
            nextAvailableInode: this.nextInode
        };
    }
}

module.exports = EXT4;
