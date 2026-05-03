class BaseFileSystem {
    constructor(name) {
        this.name = name;
        this.root = {
            name: '/',
            type: 'folder',
            children: {},
            createdAt: new Date(),
            modifiedAt: new Date()
        };
    }

    _resolvePath(path) {
        // Strip leading slashes for simplicity, treat root as absolute
        let cleanPath = path.startsWith('/') ? path.substring(1) : path;
        if (cleanPath === '') return { parent: null, targetName: '/', isRoot: true };

        const parts = cleanPath.split('/').filter(p => p.length > 0);
        let current = this.root;

        for (let i = 0; i < parts.length - 1; i++) {
            if (current.children[parts[i]] && current.children[parts[i]].type === 'folder') {
                current = current.children[parts[i]];
            } else {
                return null; // Path not found
            }
        }
        return { parent: current, targetName: parts[parts.length - 1], isRoot: false };
    }

    createFile(path) {
        const resolved = this._resolvePath(path);
        if (!resolved || resolved.isRoot) return { success: false, error: 'Invalid path' };
        
        const { parent, targetName } = resolved;
        if (parent.children[targetName]) {
            return { success: false, error: 'File already exists' };
        }

        parent.children[targetName] = {
            name: targetName,
            type: 'file',
            data: '',
            size: 0,
            createdAt: new Date(),
            modifiedAt: new Date()
        };

        return { success: true, message: `File '${targetName}' created.` };
    }

    deleteFile(path) {
        const resolved = this._resolvePath(path);
        if (!resolved || resolved.isRoot) return { success: false, error: 'Invalid path' };
        
        const { parent, targetName } = resolved;
        if (!parent.children[targetName]) return { success: false, error: 'File not found' };
        if (parent.children[targetName].type !== 'file') return { success: false, error: 'Target is not a file' };

        delete parent.children[targetName];
        return { success: true, message: `File '${targetName}' deleted.` };
    }

    readFile(path) {
        const resolved = this._resolvePath(path);
        if (!resolved || resolved.isRoot) return { success: false, error: 'Invalid path' };
        
        const { parent, targetName } = resolved;
        const file = parent.children[targetName];
        
        if (!file) return { success: false, error: 'File not found' };
        if (file.type !== 'file') return { success: false, error: 'Target is not a file' };

        return { success: true, data: file.data };
    }

    writeFile(path, data) {
        const resolved = this._resolvePath(path);
        if (!resolved || resolved.isRoot) return { success: false, error: 'Invalid path' };
        
        const { parent, targetName } = resolved;
        const file = parent.children[targetName];
        
        if (!file) return { success: false, error: 'File not found' };
        if (file.type !== 'file') return { success: false, error: 'Target is not a file' };

        file.data = data;
        file.size = data.length; // Basic size simulation
        file.modifiedAt = new Date();

        return { success: true, message: `Data written to '${targetName}'.` };
    }

    renameFile(oldPath, newName) {
        const resolved = this._resolvePath(oldPath);
        if (!resolved || resolved.isRoot) return { success: false, error: 'Invalid path' };
        
        const { parent, targetName } = resolved;
        const file = parent.children[targetName];
        
        if (!file) return { success: false, error: 'File not found' };
        if (parent.children[newName]) return { success: false, error: 'A file/folder with the new name already exists' };

        file.name = newName;
        file.modifiedAt = new Date();
        parent.children[newName] = file;
        delete parent.children[targetName];

        return { success: true, message: `Renamed '${targetName}' to '${newName}'.` };
    }

    createFolder(path) {
        const resolved = this._resolvePath(path);
        if (!resolved || resolved.isRoot) return { success: false, error: 'Invalid path' };
        
        const { parent, targetName } = resolved;
        if (parent.children[targetName]) {
            return { success: false, error: 'Folder already exists' };
        }

        parent.children[targetName] = {
            name: targetName,
            type: 'folder',
            children: {},
            createdAt: new Date(),
            modifiedAt: new Date()
        };

        return { success: true, message: `Folder '${targetName}' created.` };
    }

    deleteFolder(path) {
        const resolved = this._resolvePath(path);
        if (!resolved || resolved.isRoot) return { success: false, error: 'Invalid path' };
        
        const { parent, targetName } = resolved;
        const folder = parent.children[targetName];
        
        if (!folder) return { success: false, error: 'Folder not found' };
        if (folder.type !== 'folder') return { success: false, error: 'Target is not a folder' };

        // For simulation, delete recursively without checking if empty
        delete parent.children[targetName];
        return { success: true, message: `Folder '${targetName}' deleted.` };
    }

    listItems(path = '/') {
        let targetFolder;
        const resolved = this._resolvePath(path);
        
        if (!resolved) return { success: false, error: 'Path not found' };
        
        if (resolved.isRoot) {
            targetFolder = this.root;
        } else {
            targetFolder = resolved.parent.children[resolved.targetName];
            if (!targetFolder || targetFolder.type !== 'folder') {
                return { success: false, error: 'Target is not a folder' };
            }
        }

        const items = Object.values(targetFolder.children).map(item => ({
            name: item.name,
            type: item.type,
            size: item.size || 0,
            createdAt: item.createdAt,
            modifiedAt: item.modifiedAt
        }));

        return { success: true, items };
    }
}

module.exports = BaseFileSystem;
