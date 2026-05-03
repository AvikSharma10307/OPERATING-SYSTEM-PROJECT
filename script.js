document.addEventListener('DOMContentLoaded', () => {
    // API Configuration
    const API_BASE = 'http://localhost:3000/api/vfs';

    // UI Elements
    const loadingOverlay = document.getElementById('loadingOverlay');
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Navigation & Views
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');
    
    // Dashboard Elements
    const fsSelect = document.getElementById('fsSelect');
    const dashActiveFS = document.getElementById('dashActiveFS');
    const dashTotalFiles = document.getElementById('dashTotalFiles');
    const vfsLogsList = document.getElementById('vfsLogsList');
    const refreshLogsBtn = document.getElementById('refreshLogsBtn');
    
    // Explorer Elements
    const fileGrid = document.getElementById('fileGrid');
    const breadcrumbs = document.getElementById('breadcrumbs');
    const btnNewFolder = document.getElementById('btnNewFolder');
    const btnNewFile = document.getElementById('btnNewFile');
    const btnGridView = document.getElementById('btnGridView');
    const btnListView = document.getElementById('btnListView');
    const globalSearch = document.getElementById('globalSearch');
    
    // Context Menu & Modals
    const contextMenu = document.getElementById('contextMenu');
    const inputModal = document.getElementById('inputModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalInput = document.getElementById('modalInput');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');
    
    // State
    let currentPath = '/';
    let currentFS = 'FAT32';
    let selectedItemForContext = null;
    let modalAction = null; // 'create_file', 'create_folder', 'rename'
    let notifCount = 0;

    // ==========================================
    // 1. INITIALIZATION & UTILS
    // ==========================================

    // Restore theme from localStorage
    const savedTheme = localStorage.getItem('vfs-theme');
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        themeToggle.querySelector('i').className = 'fa-solid fa-sun';
    }

    setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.visibility = 'hidden';
            initApp();
            showToast('success', 'VFS Simulator loaded successfully!');
        }, 800);
    }, 1200);

    async function initApp() {
        await fetchStatus();
        await fetchLogs();
        if(currentPath === '/') refreshExplorer();
    }

    async function fetchAPI(endpoint, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (body) options.body = JSON.stringify(body);
            
            const res = await fetch(`${API_BASE}${endpoint}`, options);
            return await res.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: 'Failed to connect to backend.' };
        }
    }

    // ==========================================
    // 2. DASHBOARD & NAVIGATION LOGIC
    // ==========================================
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        const icon = themeToggle.querySelector('i');
        const isLight = body.classList.contains('light-theme');
        icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        localStorage.setItem('vfs-theme', isLight ? 'light' : 'dark');
        showToast('info', `Switched to ${isLight ? 'Light' : 'Dark'} mode`);
    });

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = item.getAttribute('data-view');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            views.forEach(v => v.classList.remove('active'));
            const viewEl = document.getElementById(`${targetView}View`);
            if (viewEl) viewEl.classList.add('active');
            
            if (targetView === 'explorer') refreshExplorer();
            if (targetView === 'dashboard') {
                fetchStatus();
                fetchLogs();
            }
        });
    });

    fsSelect.addEventListener('change', async (e) => {
        const type = e.target.value;
        const res = await fetchAPI('/switch', 'POST', { type });
        if (res.success) {
            currentFS = type;
            dashActiveFS.innerText = type;
            currentPath = '/';
            refreshExplorer();
            fetchLogs();
        } else {
            alert(res.error);
        }
    });

    refreshLogsBtn.addEventListener('click', fetchLogs);

    async function fetchStatus() {
        const res = await fetchAPI('/status');
        if (res.success) {
            currentFS = res.activeFS;
            dashActiveFS.innerText = currentFS;
            fsSelect.value = currentFS;
        }
    }

    async function fetchLogs() {
        const res = await fetchAPI('/logs');
        if (res.success && res.logs) {
            vfsLogsList.innerHTML = '';
            // Show last 10 logs reversed
            const recent = res.logs.slice(-10).reverse();
            if (recent.length === 0) {
                vfsLogsList.innerHTML = `<li><div class="activity-details"><p>No activity yet.</p></div></li>`;
            } else {
                recent.forEach(log => {
                    const isErr = log.log.includes('Error');
                    const colorClass = isErr ? 'bg-red' : 'bg-blue';
                    const icon = isErr ? 'fa-exclamation-triangle' : 'fa-check';
                    
                    vfsLogsList.innerHTML += `
                        <li>
                            <div class="activity-icon ${colorClass}"><i class="fa-solid ${icon}"></i></div>
                            <div class="activity-details">
                                <p><strong>${log.operation}</strong></p>
                                <span>${log.log}</span>
                            </div>
                        </li>
                    `;
                });
            }
        }
    }

    // ==========================================
    // 3. FILE EXPLORER LOGIC
    // ==========================================
    
    // View toggles
    btnListView.addEventListener('click', () => {
        fileGrid.classList.add('list-view');
        btnListView.classList.add('active');
        btnGridView.classList.remove('active');
    });
    
    btnGridView.addEventListener('click', () => {
        fileGrid.classList.remove('list-view');
        btnGridView.classList.add('active');
        btnListView.classList.remove('active');
    });

    async function refreshExplorer() {
        const res = await fetchAPI(`/list?path=${encodeURIComponent(currentPath)}`);
        
        // Update breadcrumbs
        renderBreadcrumbs();

        if (res.success) {
            renderGrid(res.items);
            if(document.getElementById('dashboardView').classList.contains('active')){
                dashTotalFiles.innerText = res.items.length;
            }
        } else {
            fileGrid.innerHTML = `<div class="empty-state text-red">Error: ${res.error}</div>`;
        }
    }

    function renderBreadcrumbs() {
        if (currentPath === '/') {
            breadcrumbs.innerHTML = `<span class="crumb" data-path="/">Root</span>`;
        } else {
            let html = `<span class="crumb" data-path="/">Root</span>`;
            const parts = currentPath.split('/').filter(p => p);
            let accum = '';
            parts.forEach(p => {
                accum += `/${p}`;
                html += `<span class="crumb" data-path="${accum}">${p}</span>`;
            });
            breadcrumbs.innerHTML = html;
        }

        // Add listeners
        document.querySelectorAll('.crumb').forEach(crumb => {
            crumb.addEventListener('click', (e) => {
                currentPath = e.target.getAttribute('data-path');
                refreshExplorer();
            });
        });
    }

    function renderGrid(items) {
        if (items.length === 0) {
            fileGrid.innerHTML = `<div class="empty-state">This folder is empty.</div>`;
            return;
        }

        // Sort folders first
        items.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });

        fileGrid.innerHTML = '';
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = `file-item ${item.type}`;
            el.setAttribute('data-name', item.name);
            el.setAttribute('data-type', item.type);
            
            const iconClass = item.type === 'folder' ? 'fa-solid fa-folder' : 'fa-solid fa-file-lines';
            
            el.innerHTML = `
                <i class="item-icon ${iconClass}"></i>
                <span class="item-name">${item.name}</span>
            `;

            // Navigation into folder
            el.addEventListener('dblclick', () => {
                if (item.type === 'folder') {
                    currentPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
                    refreshExplorer();
                }
            });

            // Context Menu triggers
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation(); // prevent grid context menu
                showContextMenu(e.pageX, e.pageY, item);
            });

            fileGrid.appendChild(el);
        });
    }

    // Grid level context menu (click empty space to create)
    fileGrid.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // Hide delete/rename, show generic options?
        // For simplicity, just hide menu if clicking empty space
        hideContextMenu();
    });

    // Instant Search Filter
    globalSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.file-item').forEach(item => {
            const name = item.getAttribute('data-name').toLowerCase();
            if (name.includes(term)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // ==========================================
    // 4. CONTEXT MENU & MODALS LOGIC
    // ==========================================
    
    function showContextMenu(x, y, item) {
        selectedItemForContext = item;
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.display = 'block';
    }

    function hideContextMenu() {
        contextMenu.style.display = 'none';
        selectedItemForContext = null;
    }

    document.addEventListener('click', hideContextMenu);

    // Context Menu Actions
    document.getElementById('ctxOpen').addEventListener('click', () => {
        if (selectedItemForContext && selectedItemForContext.type === 'folder') {
            currentPath = currentPath === '/' ? `/${selectedItemForContext.name}` : `${currentPath}/${selectedItemForContext.name}`;
            refreshExplorer();
        } else {
            alert("Cannot 'open' a file in this simple simulator (no editor yet).");
        }
    });

    document.getElementById('ctxDelete').addEventListener('click', async () => {
        if (!selectedItemForContext) return;
        const targetPath = currentPath === '/' ? `/${selectedItemForContext.name}` : `${currentPath}/${selectedItemForContext.name}`;
        
        const res = await fetchAPI('/delete', 'DELETE', { 
            path: targetPath, 
            type: selectedItemForContext.type 
        });
        
        if (res.success) {
            refreshExplorer();
        } else {
            alert(`Error: ${res.error}`);
        }
    });

    document.getElementById('ctxRename').addEventListener('click', () => {
        if (!selectedItemForContext) return;
        openModal('rename', `Rename ${selectedItemForContext.name}`);
        modalInput.value = selectedItemForContext.name;
    });

    // Top Bar Action Buttons
    btnNewFile.addEventListener('click', () => {
        openModal('create_file', 'Create New File');
    });

    btnNewFolder.addEventListener('click', () => {
        openModal('create_folder', 'Create New Folder');
    });

    // Modal Logic
    function openModal(action, title) {
        modalAction = action;
        modalTitle.innerText = title;
        modalInput.value = '';
        inputModal.classList.add('active');
        setTimeout(() => modalInput.focus(), 100);
    }

    function closeModal() {
        inputModal.classList.remove('active');
        modalAction = null;
    }

    modalCancel.addEventListener('click', closeModal);

    modalConfirm.addEventListener('click', async () => {
        const val = modalInput.value.trim();
        if (!val) return;
        
        let res;
        if (modalAction === 'create_file' || modalAction === 'create_folder') {
            const targetPath = currentPath === '/' ? `/${val}` : `${currentPath}/${val}`;
            const type = modalAction === 'create_folder' ? 'folder' : 'file';
            res = await fetchAPI('/create', 'POST', { path: targetPath, type });
        } 
        else if (modalAction === 'rename') {
            const oldPath = currentPath === '/' ? `/${selectedItemForContext.name}` : `${currentPath}/${selectedItemForContext.name}`;
            res = await fetchAPI('/rename', 'PUT', { path: oldPath, newName: val });
        }

        if (res && res.success) {
            closeModal();
            refreshExplorer();
        } else if (res) {
            alert(`Error: ${res.error}`);
        }
    });

    // Allow Enter key to submit modal
    modalInput.addEventListener('keyup', (e) => {
        if(e.key === 'Enter') modalConfirm.click();
    });

    // ==========================================
    // 5. TERMINAL EMULATOR LOGIC
    // ==========================================
    const terminalInput = document.getElementById('terminalInput');
    const terminalOutput = document.getElementById('terminalOutput');
    const terminalBody = document.getElementById('terminalBody');
    const terminalInputLine = document.querySelector('.terminal-input-line');
    const terminalCursor = document.querySelector('.cursor');
    const terminalPrompt = document.querySelector('.prompt');
    const btnClearTerm = document.getElementById('btnClearTerm');

    let commandHistory = [];
    let historyIndex = -1;

    // Clear Terminal Button Logic
    if (btnClearTerm) {
        btnClearTerm.addEventListener('click', () => {
            terminalOutput.innerHTML = '';
        });
    }

    // Focus input when clicking anywhere in terminal body
    if (terminalBody) {
        terminalBody.addEventListener('click', () => {
            terminalInput.focus();
        });
    }

    // Custom Cursor logic
    function updateTerminalCursor() {
        if (!terminalInput) return;
        const val = terminalInput.value;
        terminalInputLine.setAttribute('data-text', val);
        
        // Very basic character width calculation for monospace font (approximate)
        const charWidth = 9; // Approx width of 15px consolas char
        const promptWidth = terminalPrompt.getBoundingClientRect().width;
        
        const cursorPos = promptWidth + (val.length * charWidth) + 8; // 8px margin
        terminalCursor.style.left = `${cursorPos}px`;
    }

    if (terminalInput) {
        terminalInput.addEventListener('input', updateTerminalCursor);
        // Initial cursor setup
        setTimeout(updateTerminalCursor, 100);

        terminalInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const cmdStr = terminalInput.value;
                terminalInput.value = '';
                updateTerminalCursor();
                
                if (cmdStr.trim()) {
                    commandHistory.push(cmdStr);
                    historyIndex = commandHistory.length;
                    
                    printCommandPrompt(cmdStr);
                    await processCommand(cmdStr.trim());
                } else {
                    printCommandPrompt('');
                }
            } 
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    terminalInput.value = commandHistory[historyIndex];
                    updateTerminalCursor();
                }
            } 
            else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    terminalInput.value = commandHistory[historyIndex];
                } else if (historyIndex === commandHistory.length - 1) {
                    historyIndex++;
                    terminalInput.value = '';
                }
                updateTerminalCursor();
            }
        });
    }

    function printToTerminal(text, className = 'info') {
        const line = document.createElement('div');
        line.className = `output-line ${className}`;
        line.innerText = text;
        terminalOutput.appendChild(line);
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    function printCommandPrompt(cmd) {
        const line = document.createElement('div');
        line.className = `output-line`;
        line.innerHTML = `<span class="prompt-user">root@vfs</span> <span class="prompt-path">~</span> <span class="prompt-arrow">❯</span> <span style="color: #e2e8f0;">${cmd.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>`;
        terminalOutput.appendChild(line);
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    async function processCommand(cmdStr) {
        const parts = cmdStr.split(' ');
        const cmd = parts[0].toLowerCase();
        const arg1 = parts[1];
        const restArgs = parts.slice(2).join(' ');

        try {
            switch (cmd) {
                case 'help':
                    printToTerminal('Available commands:');
                    printToTerminal('  mkdir <dir>      - Create a folder');
                    printToTerminal('  touch <file>     - Create a file');
                    printToTerminal('  ls [path]        - List items');
                    printToTerminal('  read <file>      - Read file contents');
                    printToTerminal('  write <file> <data> - Write text to file');
                    printToTerminal('  rm <name>        - Delete file or folder');
                    printToTerminal('  rename <old> <new> - Rename an item');
                    printToTerminal('  switch <fs>      - Switch FS (fat32, ntfs, ext4)');
                    printToTerminal('  clear            - Clear terminal screen');
                    break;

                case 'clear':
                    terminalOutput.innerHTML = '';
                    break;

                case 'switch':
                    if (!arg1) { printToTerminal('Usage: switch <fs_type>', 'error'); break; }
                    const switchRes = await fetchAPI('/switch', 'POST', { type: arg1 });
                    if (switchRes.success) {
                        printToTerminal(switchRes.message, 'success');
                        currentFS = arg1.toUpperCase();
                        dashActiveFS.innerText = currentFS;
                        fsSelect.value = currentFS;
                        currentPath = '/';
                    } else {
                        printToTerminal(switchRes.error || 'Switch failed', 'error');
                    }
                    break;

                case 'mkdir':
                    if (!arg1) { printToTerminal('Usage: mkdir <dir>', 'error'); break; }
                    const mkdirPath = currentPath === '/' ? `/${arg1}` : `${currentPath}/${arg1}`;
                    const mkRes = await fetchAPI('/create', 'POST', { path: mkdirPath, type: 'folder' });
                    printToTerminal(mkRes.success ? mkRes.message : mkRes.error, mkRes.success ? 'success' : 'error');
                    break;

                case 'touch':
                    if (!arg1) { printToTerminal('Usage: touch <file>', 'error'); break; }
                    const touchPath = currentPath === '/' ? `/${arg1}` : `${currentPath}/${arg1}`;
                    const tchRes = await fetchAPI('/create', 'POST', { path: touchPath, type: 'file' });
                    printToTerminal(tchRes.success ? tchRes.message : tchRes.error, tchRes.success ? 'success' : 'error');
                    break;

                case 'ls':
                    let lsPath = currentPath;
                    if (arg1) {
                        lsPath = arg1.startsWith('/') ? arg1 : `${currentPath === '/' ? '' : currentPath}/${arg1}`;
                    }
                    const lsRes = await fetchAPI(`/list?path=${encodeURIComponent(lsPath)}`);
                    if (lsRes.success) {
                        if (lsRes.items.length === 0) {
                            printToTerminal('Directory is empty', 'info');
                        } else {
                            lsRes.items.forEach(item => {
                                const typeClass = item.type === 'folder' ? 'dir' : 'file';
                                printToTerminal(`${item.name}`, typeClass);
                            });
                        }
                    } else {
                        printToTerminal(`ls: ${lsRes.error}`, 'error');
                    }
                    break;

                case 'read':
                    if (!arg1) { printToTerminal('Usage: read <file>', 'error'); break; }
                    const readPath = currentPath === '/' ? `/${arg1}` : `${currentPath}/${arg1}`;
                    const readRes = await fetchAPI(`/read?path=${encodeURIComponent(readPath)}`);
                    if (readRes.success) {
                        printToTerminal(readRes.data || '(empty file)', 'file');
                    } else {
                        printToTerminal(`read: ${readRes.error}`, 'error');
                    }
                    break;

                case 'write':
                    if (!arg1 || !restArgs) { printToTerminal('Usage: write <file> <text>', 'error'); break; }
                    const writePath = currentPath === '/' ? `/${arg1}` : `${currentPath}/${arg1}`;
                    const writeRes = await fetchAPI('/write', 'POST', { path: writePath, data: restArgs });
                    printToTerminal(writeRes.success ? writeRes.message : writeRes.error, writeRes.success ? 'success' : 'error');
                    break;

                case 'rm':
                    if (!arg1) { printToTerminal('Usage: rm <name>', 'error'); break; }
                    const rmPath = currentPath === '/' ? `/${arg1}` : `${currentPath}/${arg1}`;
                    let rmRes = await fetchAPI('/delete', 'DELETE', { path: rmPath, type: 'file' });
                    if (!rmRes.success && rmRes.error.includes('Target is not a file')) {
                        rmRes = await fetchAPI('/delete', 'DELETE', { path: rmPath, type: 'folder' });
                    }
                    printToTerminal(rmRes.success ? rmRes.message : rmRes.error, rmRes.success ? 'success' : 'error');
                    break;

                case 'rename':
                    if (!arg1 || !parts[2]) { printToTerminal('Usage: rename <old> <new>', 'error'); break; }
                    const oldPath = currentPath === '/' ? `/${arg1}` : `${currentPath}/${arg1}`;
                    const renRes = await fetchAPI('/rename', 'PUT', { path: oldPath, newName: parts[2] });
                    printToTerminal(renRes.success ? renRes.message : renRes.error, renRes.success ? 'success' : 'error');
                    break;

                default:
                    printToTerminal(`Command not found: ${cmd}`, 'error');
                    break;
            }
        } catch (e) {
            printToTerminal(`System Error: ${e.message}`, 'error');
        }
        
        if (['mkdir', 'touch', 'write', 'rm', 'rename'].includes(cmd)) {
            fetchLogs();
            if (document.getElementById('explorerView').classList.contains('active')) {
                refreshExplorer();
            }
            // Also update visualization if active
            if (document.getElementById('visualizationView').classList.contains('active')) {
                updateVisualization();
            }
        }
    }

    // ==========================================
    // 6. VISUALIZATION PANEL LOGIC
    // ==========================================
    const FS_DESCRIPTIONS = {
        'FAT32': 'Simple Cluster-Based Storage',
        'NTFS':  'Secure Journaled File System',
        'EXT4':  'Extended Fast Inode FS'
    };

    const FS_GLOW_COLORS = {
        'FAT32': 'rgba(255, 215, 0, 0.2)',
        'NTFS':  'rgba(188, 19, 254, 0.2)',
        'EXT4':  'rgba(0, 242, 255, 0.2)'
    };

    const FS_NAME_COLORS = {
        'FAT32': '#ffd700',
        'NTFS':  '#bc13fe',
        'EXT4':  '#00f2ff'
    };

    // Hook visualization tab
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            const t = item.getAttribute('data-view');
            if (t === 'visualization') {
                await updateVisualization();
            }
        });
    });

    async function updateVisualization() {
        const fs = currentFS.toUpperCase();

        // 1. Update Flow Banner label
        const flowFSLabel = document.getElementById('flowFSLabel');
        if (flowFSLabel) flowFSLabel.textContent = fs;

        // 2. Update Active Engine Glowing Card
        const engineName = document.getElementById('engineName');
        const engineDesc = document.getElementById('engineDesc');
        const engineGlow = document.getElementById('engineGlow');
        if (engineName) {
            engineName.textContent = fs;
            engineName.style.color = FS_NAME_COLORS[fs] || 'var(--neon-cyan)';
            engineName.style.textShadow = `0 0 20px ${FS_GLOW_COLORS[fs]}`;
        }
        if (engineDesc) engineDesc.textContent = FS_DESCRIPTIONS[fs] || '';
        if (engineGlow) engineGlow.style.background = `radial-gradient(circle, ${FS_GLOW_COLORS[fs]}, transparent 70%)`;

        // 3. Update RAM Bars with simulated random fluctuation
        updateRAMBars();

        // 4. Fetch real file list and update storage + FS-specific panel
        const res = await fetchAPI(`/list?path=/`);
        const items = res.success ? res.items : [];
        updateStorageBlocks(items.length);
        switchFSPanel(fs, items);
        triggerFlowAnimation();
    }

    function updateRAMBars() {
        const bars = {
            'FAT32': { el: document.getElementById('ramFAT32'), val: 20 + Math.floor(Math.random() * 25) },
            'NTFS':  { el: document.getElementById('ramNTFS'),  val: 35 + Math.floor(Math.random() * 20) },
            'EXT4':  { el: document.getElementById('ramEXT4'),  val: 25 + Math.floor(Math.random() * 30) }
        };

        // Active FS gets higher RAM
        const fs = currentFS.toUpperCase();
        if (bars[fs]) bars[fs].val = 55 + Math.floor(Math.random() * 30);

        Object.entries(bars).forEach(([key, { el, val }]) => {
            if (el) {
                el.style.width = `${val}%`;
                const valEl = el.closest('.ram-bar-item')?.querySelector('.bar-val');
                if (valEl) valEl.textContent = `${val}%`;
            }
        });
    }

    function updateStorageBlocks(fileCount) {
        const grid = document.getElementById('storageBlockGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const total = 100; // 100 total blocks for denser look
        const usedCount = Math.min(fileCount * 3 + 6, total);
        for (let i = 0; i < total; i++) {
            const block = document.createElement('div');
            block.className = 'storage-block' + (i < usedCount ? ' used' : '');
            block.style.animationDelay = `${i * 0.008}s`;
            grid.appendChild(block);
        }
    }

    function switchFSPanel(fs, items) {
        // Hide all
        document.getElementById('vizFAT32').style.display = 'none';
        document.getElementById('vizNTFS').style.display  = 'none';
        document.getElementById('vizEXT4').style.display  = 'none';

        if (fs === 'FAT32') {
            document.getElementById('vizFAT32').style.display = 'block';
            renderFAT32(items);
        } else if (fs === 'NTFS') {
            document.getElementById('vizNTFS').style.display = 'block';
            renderNTFS(items);
        } else if (fs === 'EXT4') {
            document.getElementById('vizEXT4').style.display = 'block';
            renderEXT4(items);
        }
    }

    function renderFAT32(items) {
        const grid = document.getElementById('fat32Grid');
        if (!grid) return;
        grid.innerHTML = '';
        const totalSectors = 64;
        const reserved = [0, 1, 2, 3]; // Boot, FAT1, FAT2, RootDir
        const badSectors = [27, 41, 55]; // Simulate bad sectors for visual variety

        for (let i = 0; i < totalSectors; i++) {
            const sec = document.createElement('div');
            if (reserved.includes(i)) {
                sec.className = 'fat32-sector reserved';
                sec.textContent = ['BOOT', 'FAT1', 'FAT2', 'ROOT'][i];
            } else if (badSectors.includes(i)) {
                sec.className = 'fat32-sector bad';
                sec.textContent = 'BAD';
            } else if (i - reserved.length < items.length) {
                sec.className = 'fat32-sector allocated';
                const item = items[i - reserved.length];
                sec.textContent = item ? item.name.substring(0, 5) : 'DATA';
            } else {
                sec.className = 'fat32-sector free';
                sec.textContent = `S${i.toString(16).toUpperCase().padStart(2,'0')}`;
            }
            sec.style.animationDelay = `${i * 0.02}s`;
            grid.appendChild(sec);
        }
    }

    let ntfsInterval = null;
    const ntfsOps = ['CREATE', 'WRITE', 'DELETE', 'RENAME', 'ACCESS', 'COMMIT'];

    function renderNTFS(items) {
        const container = document.getElementById('journalEntries');
        if (!container) return;
        container.innerHTML = '';

        // Show existing items as committed journal entries
        items.forEach((item, idx) => {
            addJournalEntry(container, {
                ts: getTimestamp(),
                op: 'COMMIT',
                target: item.name,
                status: 'ok'
            });
        });

        // Keep adding live fake journal entries
        if (ntfsInterval) clearInterval(ntfsInterval);
        ntfsInterval = setInterval(() => {
            if (!document.getElementById('vizNTFS') || document.getElementById('vizNTFS').style.display === 'none') {
                clearInterval(ntfsInterval);
                return;
            }
            const names = items.length ? items.map(i => i.name) : ['system.dat', 'meta.log'];
            addJournalEntry(container, {
                ts: getTimestamp(),
                op: ntfsOps[Math.floor(Math.random() * ntfsOps.length)],
                target: names[Math.floor(Math.random() * names.length)],
                status: Math.random() > 0.2 ? 'ok' : 'pending'
            });
            // Auto-trim
            while (container.children.length > 8) {
                container.removeChild(container.firstChild);
            }
            container.scrollTop = container.scrollHeight;
        }, 1500);
    }

    function addJournalEntry(container, { ts, op, target, status }) {
        const row = document.createElement('div');
        row.className = 'journal-entry';
        row.innerHTML = `
            <span class="je-ts">${ts}</span>
            <span class="je-op">${op}</span>
            <span class="je-target">${target}</span>
            <span class="je-status ${status}">${status === 'ok' ? 'COMMITTED' : 'PENDING'}</span>
        `;
        container.appendChild(row);
    }

    function getTimestamp() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    }

    function renderEXT4(items) {
        const container = document.getElementById('ext4Inodes');
        if (!container) return;
        container.innerHTML = '';

        // Always show root inode
        const allItems = [{ name: '/', type: 'folder' }, ...items];
        allItems.forEach((item, idx) => {
            const inode = document.createElement('div');
            inode.className = 'inode-card';
            const inodeNum = (idx + 2).toString().padStart(6, '0');
            const size = item.type === 'folder' ? '4096' : `${Math.floor(Math.random() * 8192)}B`;
            inode.innerHTML = `
                <div class="inode-number">inode #${inodeNum}</div>
                <div class="inode-field"><span>name:</span><span>${item.name.substring(0, 8)}</span></div>
                <div class="inode-field"><span>type:</span><span>${item.type === 'folder' ? 'dir' : 'reg'}</span></div>
                <div class="inode-field"><span>size:</span><span>${size}</span></div>
                <div class="inode-field"><span>links:</span><span>${item.type === 'folder' ? 2 : 1}</span></div>
                <div class="inode-field"><span>blk:</span><span>0x${(idx * 8 + 256).toString(16).toUpperCase()}</span></div>
            `;
            inode.style.animationDelay = `${idx * 0.07}s`;
            container.appendChild(inode);
        });
    }

    function triggerFlowAnimation() {
        const nodes = ['flowUser', 'flowVFS', 'flowFS', 'flowOutput'];
        nodes.forEach((id, i) => {
            setTimeout(() => {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.add('pulsing');
                setTimeout(() => el.classList.remove('pulsing'), 600);
            }, i * 350);
        });
    }

    // ==========================================
    // 7. ANALYTICS DASHBOARD LOGIC
    // ==========================================
    const CHART_COLORS = {
        fat32:  { bg: 'rgba(255, 215, 0, 0.25)', border: '#ffd700' },
        ntfs:   { bg: 'rgba(188, 19, 254, 0.25)', border: '#bc13fe' },
        ext4:   { bg: 'rgba(0, 242, 255, 0.25)',  border: '#00f2ff' }
    };

    // Simulated realistic performance data
    function generatePerfData() {
        return {
            FAT32: {
                read:  120 + Math.floor(Math.random() * 40),
                write: 90  + Math.floor(Math.random() * 30),
                search: 45 + Math.floor(Math.random() * 25),
                frag:   35 + Math.floor(Math.random() * 20),
                efficiency: 65 + Math.floor(Math.random() * 10)
            },
            NTFS: {
                read:  180 + Math.floor(Math.random() * 50),
                write: 150 + Math.floor(Math.random() * 40),
                search: 20 + Math.floor(Math.random() * 15),
                frag:   15 + Math.floor(Math.random() * 10),
                efficiency: 82 + Math.floor(Math.random() * 8)
            },
            EXT4: {
                read:  220 + Math.floor(Math.random() * 60),
                write: 200 + Math.floor(Math.random() * 50),
                search: 8  + Math.floor(Math.random() * 10),
                frag:   8  + Math.floor(Math.random() * 8),
                efficiency: 88 + Math.floor(Math.random() * 8)
            }
        };
    }

    // Chart.js global defaults for dark theme
    Chart.defaults.color = '#9aa0a6';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    let chartRW, chartSearch, chartFrag, chartEfficiency;
    let analyticsInterval = null;

    // Hook analytics tab
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const t = item.getAttribute('data-view');
            if (t === 'analytics') {
                initAnalytics();
            } else {
                // Clear interval when leaving analytics tab
                if (analyticsInterval) { clearInterval(analyticsInterval); analyticsInterval = null; }
            }
        });
    });

    function initAnalytics() {
        const data = generatePerfData();
        updateKPIs(data);
        createCharts(data);

        // Real-time updates every 3s
        if (analyticsInterval) clearInterval(analyticsInterval);
        analyticsInterval = setInterval(() => {
            if (!document.getElementById('analyticsView').classList.contains('active')) {
                clearInterval(analyticsInterval);
                analyticsInterval = null;
                return;
            }
            const newData = generatePerfData();
            updateKPIs(newData);
            updateCharts(newData);
        }, 3000);
    }

    function updateKPIs(data) {
        // Best performer = highest combined read+write
        const scores = { FAT32: data.FAT32.read + data.FAT32.write, NTFS: data.NTFS.read + data.NTFS.write, EXT4: data.EXT4.read + data.EXT4.write };
        const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
        const bpEl = document.getElementById('bestPerformer');
        if (bpEl) bpEl.textContent = best;

        const avgR = Math.round((data.FAT32.read + data.NTFS.read + data.EXT4.read) / 3);
        const avgW = Math.round((data.FAT32.write + data.NTFS.write + data.EXT4.write) / 3);
        const avgS = Math.round((data.FAT32.search + data.NTFS.search + data.EXT4.search) / 3);
        const arEl = document.getElementById('avgRead');
        const awEl = document.getElementById('avgWrite');
        const asEl = document.getElementById('avgSearch');
        if (arEl) arEl.textContent = `${avgR} MB/s`;
        if (awEl) awEl.textContent = `${avgW} MB/s`;
        if (asEl) asEl.textContent = `${avgS} ms`;
    }

    function createCharts(data) {
        // Destroy existing
        if (chartRW) chartRW.destroy();
        if (chartSearch) chartSearch.destroy();
        if (chartFrag) chartFrag.destroy();
        if (chartEfficiency) chartEfficiency.destroy();

        const labels = ['FAT32', 'NTFS', 'EXT4'];
        const bgColors = [CHART_COLORS.fat32.bg, CHART_COLORS.ntfs.bg, CHART_COLORS.ext4.bg];
        const borderColors = [CHART_COLORS.fat32.border, CHART_COLORS.ntfs.border, CHART_COLORS.ext4.border];
        const commonBarOpts = { borderWidth: 2, borderRadius: 8, barThickness: 36 };

        // 1. Read/Write — Simple grouped bar (easy to compare)
        chartRW = new Chart(document.getElementById('chartRW'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: '📖 Read Speed (MB/s)', data: [data.FAT32.read, data.NTFS.read, data.EXT4.read], backgroundColor: bgColors, borderColor: borderColors, ...commonBarOpts },
                    { label: '✍️ Write Speed (MB/s)', data: [data.FAT32.write, data.NTFS.write, data.EXT4.write], backgroundColor: bgColors.map(c => c.replace('0.25','0.12')), borderColor: borderColors, ...commonBarOpts, borderDash: [4, 4] }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 14, padding: 14, font: { size: 12 } } },
                    subtitle: { display: true, text: 'Higher = Better', color: '#555', padding: { bottom: 8 } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'MB/s', color: '#777' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    x: { grid: { display: false } }
                },
                animation: { duration: 800, easing: 'easeOutQuart' }
            }
        });

        // 2. Search Latency — Simple bar (lower = better, easy to see)
        chartSearch = new Chart(document.getElementById('chartSearch'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '🔍 Search Time (ms)',
                    data: [data.FAT32.search, data.NTFS.search, data.EXT4.search],
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    ...commonBarOpts
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    subtitle: { display: true, text: 'Lower = Faster', color: '#555', padding: { bottom: 8 } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Milliseconds', color: '#777' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    x: { grid: { display: false } }
                },
                animation: { duration: 800, easing: 'easeOutQuart' }
            }
        });

        // 3. Fragmentation — Doughnut (easy to see proportions)
        chartFrag = new Chart(document.getElementById('chartFrag'), {
            type: 'doughnut',
            data: {
                labels: labels.map((l, i) => `${l} — ${[data.FAT32.frag, data.NTFS.frag, data.EXT4.frag][i]}%`),
                datasets: [{
                    data: [data.FAT32.frag, data.NTFS.frag, data.EXT4.frag],
                    backgroundColor: borderColors,
                    borderColor: 'rgba(0,0,0,0.4)',
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '55%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 14, padding: 14, font: { size: 12 } } },
                    subtitle: { display: true, text: 'Lower = Better', color: '#555', padding: { bottom: 4 } }
                },
                animation: { animateRotate: true, duration: 1000 }
            }
        });

        // 4. Storage Efficiency — Horizontal bar (easy to compare %)
        chartEfficiency = new Chart(document.getElementById('chartEfficiency'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Efficiency',
                    data: [data.FAT32.efficiency, data.NTFS.efficiency, data.EXT4.efficiency],
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 24
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    subtitle: { display: true, text: 'Higher = Better (out of 100%)', color: '#555', padding: { bottom: 8 } }
                },
                scales: {
                    x: { beginAtZero: true, max: 100, title: { display: true, text: '%', color: '#777' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { grid: { display: false } }
                },
                animation: { duration: 800, easing: 'easeOutQuart' }
            }
        });
    }

    function updateCharts(data) {
        if (chartRW) {
            chartRW.data.datasets[0].data = [data.FAT32.read, data.NTFS.read, data.EXT4.read];
            chartRW.data.datasets[1].data = [data.FAT32.write, data.NTFS.write, data.EXT4.write];
            chartRW.update('active');
        }
        if (chartSearch) {
            chartSearch.data.datasets[0].data = [data.FAT32.search, data.NTFS.search, data.EXT4.search];
            chartSearch.update('active');
        }
        if (chartFrag) {
            chartFrag.data.labels = ['FAT32','NTFS','EXT4'].map((l, i) => `${l} — ${[data.FAT32.frag, data.NTFS.frag, data.EXT4.frag][i]}%`);
            chartFrag.data.datasets[0].data = [data.FAT32.frag, data.NTFS.frag, data.EXT4.frag];
            chartFrag.update('active');
        }
        if (chartEfficiency) {
            chartEfficiency.data.datasets[0].data = [data.FAT32.efficiency, data.NTFS.efficiency, data.EXT4.efficiency];
            chartEfficiency.update('active');
        }
    }

    // Export Report
    document.getElementById('btnExportReport')?.addEventListener('click', () => {
        const data = generatePerfData();
        let report = `VFS SIMULATOR - PERFORMANCE REPORT\n`;
        report += `Generated: ${new Date().toLocaleString()}\n`;
        report += `Active File System: ${currentFS}\n`;
        report += `${'='.repeat(50)}\n\n`;

        ['FAT32', 'NTFS', 'EXT4'].forEach(fs => {
            report += `--- ${fs} ---\n`;
            report += `  Read Speed:         ${data[fs].read} MB/s\n`;
            report += `  Write Speed:        ${data[fs].write} MB/s\n`;
            report += `  Search Latency:     ${data[fs].search} ms\n`;
            report += `  Fragmentation:      ${data[fs].frag}%\n`;
            report += `  Storage Efficiency: ${data[fs].efficiency}%\n\n`;
        });

        const scores = { FAT32: data.FAT32.read + data.FAT32.write, NTFS: data.NTFS.read + data.NTFS.write, EXT4: data.EXT4.read + data.EXT4.write };
        const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
        report += `${'='.repeat(50)}\n`;
        report += `BEST OVERALL PERFORMER: ${best}\n`;

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vfs_performance_report_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('success', 'Performance report exported!');
    });

    // ==========================================
    // 8. TOAST NOTIFICATIONS & POLISH
    // ==========================================
    function showToast(type = 'info', message = '') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'fa-solid fa-circle-check',
            error:   'fa-solid fa-circle-xmark',
            info:    'fa-solid fa-circle-info',
            warning: 'fa-solid fa-triangle-exclamation'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="toast-icon ${icons[type] || icons.info}"></i>
            <span class="toast-message">${message}</span>
        `;
        container.appendChild(toast);

        // Update notif counter
        notifCount++;
        const badge = document.getElementById('notifBadge');
        if (badge) badge.textContent = notifCount;

        // Auto-remove after 3.5s
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 350);
        }, 3500);
    }

    // Reset Simulator
    document.getElementById('btnReset')?.addEventListener('click', async () => {
        if (!confirm('Reset all files in the current file system?')) return;

        // Delete all root-level items
        const res = await fetchAPI('/list?path=/');
        if (res.success && res.items.length > 0) {
            for (const item of res.items) {
                await fetchAPI('/delete', 'DELETE', { path: `/${item.name}`, type: item.type });
            }
        }
        currentPath = '/';
        refreshExplorer();
        fetchLogs();
        showToast('warning', 'Simulator has been reset!');
    });

    // ==========================================

});

