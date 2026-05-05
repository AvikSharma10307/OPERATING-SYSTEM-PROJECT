const express = require('express');
const cors = require('cors');
const VFSManager = require('./backend/core/VFSManager');

// Backend server setup for VFS API endpoints
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize the single VFS Manager instance
const vfs = new VFSManager();
// Default to FAT32 on startup
vfs.switchFileSystem('FAT32');

// Status route
app.get('/api/vfs/status', (req, res) => {
    res.json({
        success: true,
        activeFS: vfs.getActiveFileSystem()
    });
});

// Switch file system
app.post('/api/vfs/switch', (req, res) => {
    const { type } = req.body;
    const result = vfs.switchFileSystem(type);
    res.json(result);
});

// List items
app.get('/api/vfs/list', (req, res) => {
    const path = req.query.path || '/';
    const result = vfs.listItems(path);
    res.json(result);
});

// Create file or folder
app.post('/api/vfs/create', (req, res) => {
    const { path, type } = req.body;
    let result;
    if (type === 'folder') {
        result = vfs.createFolder(path);
    } else {
        result = vfs.createFile(path);
    }
    res.json(result);
});

// Delete file or folder
app.delete('/api/vfs/delete', async (req, res) => {
    const { path, type } = req.body;
    let result;
    if (type === 'folder') {
        result = await vfs.deleteFolder(path);
    } else {
        result = await vfs.deleteFile(path);
    }
    res.json(result);
});

// Read file
app.get('/api/vfs/read', async (req, res) => {
    const path = req.query.path;
    const result = await vfs.readFile(path);
    res.json(result);
});

// Write file
app.post('/api/vfs/write', async (req, res) => {
    const { path, data } = req.body;
    const result = await vfs.writeFile(path, data);
    res.json(result);
});

// Rename file
app.put('/api/vfs/rename', (req, res) => {
    const { path, newName } = req.body;
    const result = vfs.renameFile(path, newName);
    res.json(result);
});

// Get Logs
app.get('/api/vfs/logs', (req, res) => {
    res.json({ success: true, logs: vfs.getVFSLogs() });
});

// Switch NTFS user role (for permission simulation)
app.post('/api/vfs/userrole', (req, res) => {
    const { role } = req.body;
    const ntfs = vfs.systems['NTFS'];
    if (ntfs && typeof ntfs.switchUser === 'function') {
        const result = ntfs.switchUser(role, role);
        res.json(result);
    } else {
        res.json({ success: false, error: 'NTFS user role switching not available' });
    }
});

// Get Block Allocation Map (for Disk Visualizer)
app.get('/api/vfs/blocks', (req, res) => {
    const fs = vfs.activeFS;
    if (!fs) return res.json({ success: false, error: 'No active FS' });

    const files = [];
    function walk(node, path) {
        if (!node.children) return;
        Object.values(node.children).forEach(child => {
            const childPath = path === '/' ? `/${child.name}` : `${path}/${child.name}`;
            if (child.type === 'file') {
                files.push({
                    name: child.name,
                    path: childPath,
                    size: child.size || 0,
                    blocks: child.blocks || []
                });
            } else if (child.type === 'folder') {
                walk(child, childPath);
            }
        });
    }
    walk(fs.root, '/');

    res.json({
        success: true,
        fsType: fs.name,
        totalBlocks: 100,
        files
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`VFS Backend running on http://localhost:${PORT}`);
});
