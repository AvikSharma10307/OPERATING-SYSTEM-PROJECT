const express = require('express');
const cors = require('cors');
const VFSManager = require('./backend/core/VFSManager');

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
app.delete('/api/vfs/delete', (req, res) => {
    const { path, type } = req.body;
    let result;
    if (type === 'folder') {
        result = vfs.deleteFolder(path);
    } else {
        result = vfs.deleteFile(path);
    }
    res.json(result);
});

// Read file
app.get('/api/vfs/read', (req, res) => {
    const path = req.query.path;
    const result = vfs.readFile(path);
    res.json(result);
});

// Write file
app.post('/api/vfs/write', (req, res) => {
    const { path, data } = req.body;
    const result = vfs.writeFile(path, data);
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`VFS Backend running on http://localhost:${PORT}`);
});
