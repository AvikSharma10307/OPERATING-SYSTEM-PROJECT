// DiskVisualizer.jsx
// Note: Created with .jsx extension as requested, but written in vanilla JS 
// to work seamlessly with the current HTML/JS stack without a bundler.

(function() {
    // 1. Inject Styles dynamically to avoid modifying existing CSS
    const style = document.createElement('style');
    style.innerHTML = `
        #diskVisualizerBtn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            background: rgba(0, 242, 255, 0.1);
            color: var(--neon-cyan, #00f2ff);
            border: 1px solid rgba(0, 242, 255, 0.3);
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            backdrop-filter: blur(10px);
            font-family: inherit;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
        }
        #diskVisualizerBtn:hover {
            background: rgba(0, 242, 255, 0.2);
            box-shadow: 0 0 15px rgba(0, 242, 255, 0.4);
        }
        
        #diskVisualizerPanel {
            position: fixed;
            bottom: 70px;
            right: 20px;
            width: 350px;
            max-height: 500px;
            background: rgba(10, 10, 15, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            z-index: 9998;
            padding: 20px;
            display: none;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            color: #fff;
            font-family: var(--font-main, 'Outfit', sans-serif);
        }
        
        #diskVisualizerPanel.visible {
            display: flex;
        }
        
        .disk-viz-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 10px;
        }
        
        .disk-viz-header h3 {
            margin: 0;
            font-size: 16px;
        }
        
        .disk-grid {
            display: grid;
            grid-template-columns: repeat(10, 1fr);
            gap: 4px;
            overflow-y: auto;
            padding-right: 5px;
        }
        
        .disk-block {
            aspect-ratio: 1;
            border-radius: 2px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.2s;
            position: relative;
            cursor: help;
        }
        
        .disk-block.used-FAT32 { background: rgba(41, 121, 255, 0.6); border-color: #2979ff; box-shadow: 0 0 8px rgba(41,121,255,0.4); }
        .disk-block.used-NTFS { background: rgba(0, 230, 118, 0.6); border-color: #00e676; box-shadow: 0 0 8px rgba(0,230,118,0.4); }
        .disk-block.used-EXT4 { background: rgba(188, 19, 254, 0.6); border-color: #bc13fe; box-shadow: 0 0 8px rgba(188,19,254,0.4); }
        
        .disk-legend {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            font-size: 12px;
            justify-content: center;
        }
        
        .legend-item { display: flex; align-items: center; gap: 4px; }
        .legend-box { width: 12px; height: 12px; border-radius: 2px; }
        .legend-FAT32 { background: #2979ff; }
        .legend-NTFS { background: #00e676; }
        .legend-EXT4 { background: #bc13fe; }
        .legend-Free { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255,255,255,0.2); }
    `;
    
    // Defer injection until DOM is ready if script is placed in head
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVisualizer);
    } else {
        initVisualizer();
    }

    function initVisualizer() {
        document.head.appendChild(style);

        // 2. Inject Toggle Button
        const btn = document.createElement('button');
        btn.id = 'diskVisualizerBtn';
        btn.innerHTML = '<i class="fa-solid fa-hard-drive"></i> Show Disk View';
        document.body.appendChild(btn);

        // 3. Inject Panel
        const panel = document.createElement('div');
        panel.id = 'diskVisualizerPanel';
        panel.innerHTML = `
            <div class="disk-viz-header">
                <h3>Disk Block Allocation Map</h3>
                <button id="refreshDiskBtn" style="background:transparent; border:none; color:var(--neon-cyan); cursor:pointer;"><i class="fa-solid fa-rotate-right"></i></button>
            </div>
            <div class="disk-grid" id="diskGrid"></div>
            <div class="disk-legend">
                <div class="legend-item"><div class="legend-box legend-FAT32"></div> FAT32</div>
                <div class="legend-item"><div class="legend-box legend-NTFS"></div> NTFS</div>
                <div class="legend-item"><div class="legend-box legend-EXT4"></div> EXT4</div>
                <div class="legend-item"><div class="legend-box legend-Free"></div> Free</div>
            </div>
        `;
        document.body.appendChild(panel);

        const diskGrid = document.getElementById('diskGrid');
        const TOTAL_BLOCKS = 100; // Simulated disk size

        // Toggle logic
        btn.addEventListener('click', () => {
            const isVisible = panel.classList.contains('visible');
            if (isVisible) {
                panel.classList.remove('visible');
                btn.innerHTML = '<i class="fa-solid fa-hard-drive"></i> Show Disk View';
            } else {
                panel.classList.add('visible');
                btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Disk View';
                renderDisk();
            }
        });

        document.getElementById('refreshDiskBtn').addEventListener('click', renderDisk);

        async function renderDisk() {
            // Fetch current active FS status
            let activeFS = 'FAT32';
            try {
                const statusRes = await fetch('http://localhost:3000/api/vfs/status');
                const statusData = await statusRes.json();
                if (statusData.success) activeFS = statusData.activeFS;
            } catch(e) {
                console.error('DiskVisualizer: Failed to fetch FS status', e);
            }

            // Fetch files to gather allocated blocks
            let usedBlocks = [];
            try {
                const listRes = await fetch('http://localhost:3000/api/vfs/list?path=/');
                const listData = await listRes.json();
                if (listData.success) {
                    // Collect blocks from all files
                    listData.items.forEach(item => {
                        if (item.type === 'file' && item.blocks && Array.isArray(item.blocks)) {
                            usedBlocks = usedBlocks.concat(item.blocks);
                        }
                    });
                }
            } catch(e) {
                console.error('DiskVisualizer: Failed to fetch file list', e);
            }

            // Render Grid
            diskGrid.innerHTML = '';
            for (let i = 1; i <= TOTAL_BLOCKS; i++) {
                const block = document.createElement('div');
                block.className = 'disk-block';
                block.title = \`Block \${i}\`;
                
                if (usedBlocks.includes(i)) {
                    // Mark as used by active FS (blue/green/purple)
                    block.classList.add(\`used-\${activeFS}\`);
                    block.title += \` (Used by \${activeFS})\`;
                } else {
                    block.title += \` (Free)\`;
                }
                diskGrid.appendChild(block);
            }
        }
    }
})();
