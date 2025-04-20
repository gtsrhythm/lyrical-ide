document.addEventListener('DOMContentLoaded', () => {

    const editor = document.getElementById('editor');
    const fileTitle = document.getElementById('file-title');
    const filesList = document.getElementById('files-list');
    const newFileBtn = document.getElementById('new-file-btn');
    const saveBtn = document.getElementById('save-btn');
    const exportBtn = document.getElementById('export-btn');
    const saveModal = document.getElementById('save-modal');
    const saveFilename = document.getElementById('save-filename');
    const saveConfirmBtn = document.getElementById('save-confirm-btn');
    const saveCancelBtn = document.getElementById('save-cancel-btn');
    const exportModal = document.getElementById('export-modal');
    const exportConfirmBtn = document.getElementById('export-confirm-btn');
    const exportCancelBtn = document.getElementById('export-cancel-btn');
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const shortcutsCloseBtn = document.getElementById('shortcuts-close-btn');
    const wordCount = document.getElementById('word-count');
    const lineCount = document.getElementById('line-count');
    const saveIndicator = document.getElementById('save-indicator');
    const filesPanel = document.getElementById('files-panel');
    const editorPanel = document.getElementById('editor-panel');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const toggleIcon = document.getElementById('toggle-icon');
    const viewToggle = document.getElementById('view-toggle');
    const viewIcon = document.getElementById('view-icon');
    const editorContainer = document.querySelector('.editor-container');
    const markdownPreview = document.getElementById('markdown-preview');
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    const settingFontSize = document.getElementById('setting-font-size');
    const settingAutosave = document.getElementById('setting-autosave');
    const settingSpellcheck = document.getElementById('setting-spellcheck');

    const rhymeBtn = document.getElementById('rhyme-btn');
    const rhymeModal = document.getElementById('rhyme-modal');
    const apiKeySection = document.getElementById('api-key-section');
    const rhymeSuggestionSection = document.getElementById('rhyme-suggestion-section');
    const groqApiKeyInput = document.getElementById('groq-api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const rhymeCancelBtn = document.getElementById('rhyme-cancel-btn');
    const rhymeCloseBtn = document.getElementById('rhyme-close-btn');
    const rhymeWordInput = document.getElementById('rhyme-word-input');
    const getRhymesBtn = document.getElementById('get-rhymes-btn');
    const rhymeResults = document.getElementById('rhyme-results');
    const rhymeLoading = document.getElementById('rhyme-loading');
    const manageApiKeyBtn = document.getElementById('manage-api-key-btn');

    let currentFileId = null;
    let files = [];
    let sidebarOpen = true;
    let editingFilename = null;
    let currentView = 'split-view'; 
    let isMobile = window.innerWidth < 768;
    let saveTimeout = null;
    let settings = {
        autosave: true,
        spellcheck: true,
        fontSize: 'medium',
    };

    marked.setOptions({
        breaks: true,        
        gfm: true,           
        headerIds: true,     
        mangle: false,       
        sanitize: false,     
        smartLists: true,    
        smartypants: true,   
        xhtml: false,        
        renderer: (() => {

            const renderer = new marked.Renderer();

            renderer.blockquote = function(quote) {

                if (typeof quote === 'object') {

                    if (quote.text) {
                        return `<blockquote>${quote.text}</blockquote>`;
                    }

                    if (quote.innerHTML) {
                        return `<blockquote>${quote.innerHTML}</blockquote>`;
                    }
                }

                return `<blockquote>${String(quote)}</blockquote>`;
            };

            const originalListitem = renderer.listitem;
            renderer.listitem = function(text, task, checked) {

                return originalListitem.call(this, text, task, checked);
            };

            return renderer;
        })()
    });

    function init() {
        loadFilesFromStorage();
        loadSettings();
        applySettings();
        renderFilesList();

        if (files.length > 0) {
            loadFile(files[0].id);
        } else {

            currentFileId = null;
            editor.value = '';
            editor.setAttribute('data-filename', '');
            document.title = 'Lyrical IDE';
            disableEditor();
        }

        checkMobileView();

        if (!isMobile) {
            const savedSidebarState = localStorage.getItem('lyrical-sidebar-state');
            if (savedSidebarState === 'closed') {
                toggleSidebar(false);
            }
        } else {

            toggleSidebar(false);
        }

        const savedViewState = localStorage.getItem('lyrical-view-state');
        if (savedViewState) {
            currentView = savedViewState;
            updateViewMode(currentView);
        } else {

            if (isMobile) {
                currentView = 'editor-only';
            }
            updateViewMode(currentView);
        }

        setupEventListeners();

        setupRhymeSuggestionsListeners();

        updateStats();
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('lyrical-settings');
        if (savedSettings) {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        }
    }

    function saveSettings() {
        localStorage.setItem('lyrical-settings', JSON.stringify(settings));
    }

    function applySettings() {

        document.body.classList.remove('editor-font-small', 'editor-font-medium', 'editor-font-large');
        document.body.classList.add(`editor-font-${settings.fontSize}`);

        editor.spellcheck = settings.spellcheck;

        settingFontSize.value = settings.fontSize;
        settingAutosave.checked = settings.autosave;
        settingSpellcheck.checked = settings.spellcheck;
    }

    function setupEventListeners() {

        newFileBtn.addEventListener('click', newFile);
        saveBtn.addEventListener('click', showSaveModal);
        exportBtn.addEventListener('click', showExportModal);
        saveConfirmBtn.addEventListener('click', saveFile);
        saveCancelBtn.addEventListener('click', hideSaveModal);
        sidebarToggle.addEventListener('click', () => toggleSidebar());
        viewToggle.addEventListener('click', toggleView);

        exportConfirmBtn.addEventListener('click', exportCurrentFile);
        exportCancelBtn.addEventListener('click', hideExportModal);
        shortcutsCloseBtn.addEventListener('click', hideShortcutsModal);

        toolbarButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                applyFormatting(btn.getAttribute('data-markdown'));
            });
        });

        editor.addEventListener('input', () => {
            if (currentFileId) {

                updateFileContent(currentFileId, editor.value);
                renderMarkdown();

                updateStats();

                if (settings.autosave) {
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        saveFilesToStorage();
                        showSaveIndicator();
                    }, 3000);
                }
            }
        });

        document.addEventListener('keydown', (e) => {

            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {

                if (e.key === 'Escape') {
                    hideAllModals();
                }
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        showSaveModal();
                        break;
                    case 'e':
                        e.preventDefault();
                        showExportModal();
                        break;
                    case '\\':
                        e.preventDefault();
                        toggleSidebar();
                        break;
                    case 'p':
                        e.preventDefault();
                        toggleView();
                        break;
                    case 'n':
                        e.preventDefault();
                        newFile();
                        break;
                    case 'b':
                        e.preventDefault();
                        if (document.activeElement === editor) {
                            applyFormatting('**');
                        }
                        break;
                    case 'i':
                        e.preventDefault();
                        if (document.activeElement === editor) {
                            applyFormatting('_');
                        }
                        break;
                    case 'h':
                        e.preventDefault();
                        if (document.activeElement === editor) {
                            applyFormatting('# ');
                        }
                        break;
                    case 'l':
                        e.preventDefault();
                        if (document.activeElement === editor) {
                            applyFormatting('- ');
                        }
                        break;
                    case 'q':
                        e.preventDefault();
                        if (document.activeElement === editor) {
                            applyFormatting('> ');
                        }
                        break;
                    case 'k':
                        e.preventDefault();
                        showShortcutsModal();
                        break;
                }
            } else if (e.key === 'Escape') {
                hideAllModals();
            }
        });

        window.addEventListener('resize', () => {
            const wasMobile = isMobile;
            isMobile = window.innerWidth < 768;

            if (wasMobile !== isMobile) {
                checkMobileView();
            }
        });

        if ('ontouchstart' in window) {
            setupTouchHandlers();
        }

        document.addEventListener('click', (e) => {
            if (editingFilename && !e.target.classList.contains('file-name-edit')) {
                const inputEl = document.querySelector('.file-name-edit');
                if (inputEl) {
                    const newTitle = inputEl.value.trim();
                    if (newTitle) {
                        updateFileTitle(editingFilename, newTitle);
                    }
                    editingFilename = null;
                    renderFilesList();
                }
            }

            if (isMobile && sidebarOpen && !e.target.closest('#files-panel') && !e.target.closest('#sidebar-toggle')) {
                toggleSidebar(false);
            }
        });
    }

    function setupRhymeSuggestionsListeners() {

        rhymeBtn.addEventListener('click', showRhymeModal);

        const savedApiKey = localStorage.getItem('groq-api-key');
        if (savedApiKey) {

            apiKeySection.style.display = 'none';
            rhymeSuggestionSection.style.display = 'block';

            groqApiKeyInput.value = '';
        }

        saveApiKeyBtn.addEventListener('click', () => {
            const apiKey = groqApiKeyInput.value.trim();
            if (apiKey) {

                localStorage.setItem('groq-api-key', apiKey);

                apiKeySection.style.display = 'none';
                rhymeSuggestionSection.style.display = 'block';
                rhymeWordInput.focus();
            }
        });

        rhymeCancelBtn.addEventListener('click', hideRhymeModal);
        rhymeCloseBtn.addEventListener('click', hideRhymeModal);

        manageApiKeyBtn.addEventListener('click', () => {

            rhymeSuggestionSection.style.display = 'none';
            apiKeySection.style.display = 'block';
            groqApiKeyInput.focus();
        });

        document.getElementById('search-icon-btn').addEventListener('click', getRhymeSuggestions);

        rhymeWordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                getRhymeSuggestions();
            }
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && 
                e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                showRhymeModal();
            }
        });
    }

    function hideAllModals() {
        hideSaveModal();
        hideExportModal();
        hideShortcutsModal();
        hideRhymeModal();
    }

    function applyFormatting(format) {
        if (!editor.value || editor.disabled) return;

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selection = editor.value.substring(start, end);

        let formattedText = '';
        let newCursorPos = 0;

        if (format === '# ' || format === '- ' || format === '> ') {

            let lineStart = start;
            while (lineStart > 0 && editor.value.charAt(lineStart - 1) !== '\n') {
                lineStart--;
            }

            const alreadyApplied = editor.value.substring(lineStart, lineStart + format.length) === format;

            if (alreadyApplied) {

                formattedText = editor.value.substring(0, lineStart) + 
                               editor.value.substring(lineStart + format.length);
                newCursorPos = Math.max(lineStart, end - format.length);
            } else {

                formattedText = editor.value.substring(0, lineStart) + 
                               format +
                               editor.value.substring(lineStart);
                newCursorPos = end + format.length;
            }
        }

        else {
            if (selection) {

                const alreadyFormatted = 
                    editor.value.substring(start - format.length, start) === format && 
                    editor.value.substring(end, end + format.length) === format;

                if (alreadyFormatted) {

                    formattedText = editor.value.substring(0, start - format.length) + 
                                   selection +
                                   editor.value.substring(end + format.length);
                    newCursorPos = start - format.length + selection.length;
                } else {

                    formattedText = editor.value.substring(0, start) + 
                                   format + selection + format +
                                   editor.value.substring(end);
                    newCursorPos = end + format.length * 2;
                }
            } else {

                formattedText = editor.value.substring(0, start) + 
                               format + format +
                               editor.value.substring(end);
                newCursorPos = start + format.length;
            }
        }

        editor.value = formattedText;
        editor.focus();
        editor.setSelectionRange(newCursorPos, newCursorPos);

        const inputEvent = new Event('input', { bubbles: true });
        editor.dispatchEvent(inputEvent);
    }

    function showSaveIndicator() {
        saveIndicator.classList.add('show');
        setTimeout(() => {
            saveIndicator.classList.remove('show');
        }, 2000);
    }

    function updateStats() {

        if (!wordCount || !lineCount) return;

        if (!editor.value) {
            wordCount.textContent = '0 words';
            lineCount.textContent = '0 lines';
            return;
        }

        const wordText = editor.value.replace(/[#*_>-]/g, '').trim();
        const words = wordText.split(/\s+/).filter(word => word.length > 0).length;
        wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;

        const lines = editor.value.split('\n').length;
        lineCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
    }

    function checkMobileView() {
        isMobile = window.innerWidth < 768;

        if (isMobile) {

            if (currentView === 'split-view') {
                currentView = 'editor-only';
                updateViewMode(currentView);
            }

            if (sidebarOpen) {
                toggleSidebar(false);
            }
        }
    }

    function setupTouchHandlers() {
        let touchStartX = 0;
        let touchEndX = 0;
        const swipeThreshold = 100; 

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, false);

        function handleSwipe() {

            if (touchStartX - touchEndX > swipeThreshold && sidebarOpen && isMobile) {
                toggleSidebar(false);
            }

            if (touchEndX - touchStartX > swipeThreshold && !sidebarOpen && isMobile) {
                toggleSidebar(true);
            }
        }
    }

    function renderMarkdown() {
        if (!editor.value) {
            markdownPreview.innerHTML = '<div class="empty-preview">Preview will appear here as you type...</div>';
            return;
        }

        try {
            const htmlContent = marked.parse(editor.value);
            markdownPreview.innerHTML = htmlContent;
        } catch (error) {
            console.error('Error rendering markdown:', error);
            markdownPreview.innerHTML = '<div class="error-preview">Error rendering preview.</div>';
        }
    }

    function toggleView() {
        switch (currentView) {
            case 'editor-only':
                currentView = isMobile ? 'preview-only' : 'split-view';
                viewIcon.textContent = 'preview';
                break;
            case 'split-view':
                currentView = 'preview-only';
                viewIcon.textContent = 'edit';
                break;
            case 'preview-only':
                currentView = 'editor-only';
                viewIcon.textContent = isMobile ? 'preview' : 'splitscreen';
                break;
        }

        updateViewMode(currentView);
        localStorage.setItem('lyrical-view-state', currentView);
    }

    function updateViewMode(mode) {
        editorContainer.classList.remove('editor-only', 'preview-only', 'split-view');
        editorContainer.classList.add(mode);

        switch (mode) {
            case 'editor-only':
                viewIcon.textContent = isMobile ? 'preview' : 'splitscreen';
                break;
            case 'split-view':
                viewIcon.textContent = 'preview';
                break;
            case 'preview-only':
                viewIcon.textContent = 'edit';
                break;
        }
    }

    function toggleSidebar(open = !sidebarOpen) {
        sidebarOpen = open;

        if (sidebarOpen) {
            filesPanel.classList.remove('collapsed');
            editorPanel.classList.add('sidebar-open');
            toggleIcon.textContent = 'menu_open';
            if (!isMobile) {
                localStorage.setItem('lyrical-sidebar-state', 'open');
            }
        } else {
            filesPanel.classList.add('collapsed');
            editorPanel.classList.remove('sidebar-open');
            toggleIcon.textContent = 'menu';
            if (!isMobile) {
                localStorage.setItem('lyrical-sidebar-state', 'closed');
            }
        }
    }

    function showSaveModal() {
        const currentFile = files.find(f => f.id === currentFileId);
        saveFilename.value = currentFile ? currentFile.title : '';
        saveModal.classList.add('show');
        saveFilename.focus();
        saveFilename.selectionStart = 0;
        saveFilename.selectionEnd = saveFilename.value.length;
    }

    function hideSaveModal() {
        saveModal.classList.remove('show');
    }

    function showExportModal() {
        if (!currentFileId) return;
        exportModal.classList.add('show');
    }

    function hideExportModal() {
        exportModal.classList.remove('show');
    }

    function showShortcutsModal() {
        shortcutsModal.classList.add('show');
    }

    function hideShortcutsModal() {
        shortcutsModal.classList.remove('show');
    }

    function saveSettingsAndClose() {

        settings.fontSize = settingFontSize.value;
        settings.autosave = settingAutosave.checked;
        settings.spellcheck = settingSpellcheck.checked;

        saveSettings();
        applySettings();

        hideSettingsModal();
    }

    function loadFilesFromStorage() {
        const storedFiles = localStorage.getItem('lyrical-files');
        files = storedFiles ? JSON.parse(storedFiles) : [];
    }

    function saveFilesToStorage() {
        localStorage.setItem('lyrical-files', JSON.stringify(files));
    }

    function newFile() {
        const newFileObj = {
            id: Date.now().toString(),
            title: 'Untitled Lyrics',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        files.unshift(newFileObj);
        saveFilesToStorage();
        renderFilesList();
        loadFile(newFileObj.id);

        enableEditor();

        setTimeout(() => {
            startEditingFilename(newFileObj.id);
        }, 100);
    }

    function loadFile(fileId) {
        const file = files.find(f => f.id === fileId);

        if (file) {
            currentFileId = file.id;
            editor.value = file.content;

            editor.setAttribute('data-filename', file.title);

            document.title = `${file.title} - Lyrical IDE`;

            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('active');
            });

            const fileElement = document.getElementById(`file-${fileId}`);
            if (fileElement) {
                fileElement.classList.add('active');
            }

            enableEditor();

            renderMarkdown();

            updateStats();
        }
    }

    function updateFileContent(fileId, content) {
        const fileIndex = files.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
            files[fileIndex].content = content;
            files[fileIndex].updatedAt = new Date().toISOString();

            if (!settings.autosave) return;

            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                saveFilesToStorage();
                showSaveIndicator();
            }, 3000);
        }
    }

    function updateFileTitle(fileId, title) {
        const fileIndex = files.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
            files[fileIndex].title = title || 'Untitled Lyrics';
            files[fileIndex].updatedAt = new Date().toISOString();
            saveFilesToStorage();

            if (fileId === currentFileId) {
                document.title = `${files[fileIndex].title} - Lyrical IDE`;
                editor.setAttribute('data-filename', files[fileIndex].title);
            }

            renderFilesList();
        }
    }

    function startEditingFilename(fileId) {
        editingFilename = fileId;
        renderFilesList();

        setTimeout(() => {
            const input = document.querySelector('.file-name-edit');
            if (input) {
                input.focus();

                input.selectionStart = input.selectionEnd = input.value.length;
            }
        }, 50);
    }

    function deleteFile(fileId) {
        const fileIndex = files.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
            files.splice(fileIndex, 1);
            saveFilesToStorage();
            renderFilesList();

            if (files.length > 0) {
                loadFile(files[0].id);
            } else {

                currentFileId = null;
                editor.value = '';
                editor.setAttribute('data-filename', '');
                document.title = 'Lyrical IDE';
                disableEditor();
            }
        }
    }

    function saveFile() {
        const filename = saveFilename.value.trim() || 'Untitled Lyrics';

        if (currentFileId) {
            updateFileTitle(currentFileId, filename);
            saveFilesToStorage();
            showSaveIndicator();
        }

        hideSaveModal();
    }

    function exportCurrentFile() {
        if (!currentFileId) return;

        const file = files.find(f => f.id === currentFileId);
        if (!file) return;

        const formatRadios = document.getElementsByName('export-format');
        let selectedFormat = 'md';

        for (const radio of formatRadios) {
            if (radio.checked) {
                selectedFormat = radio.value;
                break;
            }
        }

        let content = file.content;
        let mimeType = 'text/plain';

        if (selectedFormat === 'html') {

            content = marked.parse(file.content);

            content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${file.title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        blockquote {
            border-left: 3px solid #7c91f9;
            padding-left: 1rem;
            font-style: italic;
            color: #666;
        }
        h1, h2, h3 { color: #333; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>${file.title}</h1>
    ${content}
</body>
</html>`;
            mimeType = 'text/html';
        }

        const blob = new Blob([content], { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${file.title || 'lyrics'}.${selectedFormat}`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        hideExportModal();
    }

    function enableEditor() {
        editor.removeAttribute('disabled');
        editor.placeholder = 'Write your lyrics here...';
        editor.classList.remove('editor-disabled');
    }

    function disableEditor() {
        editor.setAttribute('disabled', 'disabled');
        editor.placeholder = 'Select or create a file to start writing...';
        editor.classList.add('editor-disabled');

        markdownPreview.innerHTML = '';
    }

    function renderFilesList() {
        filesList.innerHTML = '';

        if (files.length === 0) {

            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <span class="material-icons-round empty-icon">description</span>
                <p>No lyrics yet</p>
                <p class="empty-hint">Click the "+" button to create one</p>
            `;
            filesList.appendChild(emptyState);
            return;
        }

        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.id = `file-${file.id}`;
            fileItem.className = 'file-item';
            if (file.id === currentFileId) {
                fileItem.classList.add('active');
            }

            if (editingFilename === file.id) {
                fileItem.innerHTML = `
                    <input type="text" class="file-name-edit" value="${file.title || 'Untitled'}" />
                    <span class="file-actions">
                        <button class="file-action-btn delete" title="Delete"><span class="material-icons-round">delete</span></button>
                    </span>
                `;

                const inputEl = fileItem.querySelector('.file-name-edit');
                inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const newTitle = inputEl.value.trim();
                        if (newTitle) {
                            updateFileTitle(file.id, newTitle);
                        }
                        editingFilename = null;
                        renderFilesList();
                    } else if (e.key === 'Escape') {
                        editingFilename = null;
                        renderFilesList();
                    }
                });
            } else {
                fileItem.innerHTML = `
                    <span class="file-name">${file.title || 'Untitled'}</span>
                    <span class="file-actions">
                        <button class="file-action-btn edit-btn" title="Rename"><span class="material-icons-round">edit</span></button>
                        <button class="file-action-btn delete" title="Delete"><span class="material-icons-round">delete</span></button>
                    </span>
                `;
            }

            if (editingFilename !== file.id) {

                fileItem.addEventListener('click', (e) => {
                    const isButton = e.target.closest('.file-action-btn');

                    if (isButton) {
                        e.stopPropagation(); 

                        if (isButton.classList.contains('delete')) {
                            deleteFile(file.id);
                        } else if (isButton.classList.contains('edit-btn')) {
                            startEditingFilename(file.id);
                        }
                        return;
                    }

                    if (e.target.classList.contains('file-name') && file.id === currentFileId) {
                        if (e.detail === 2) { 
                            startEditingFilename(file.id);
                            return;
                        }
                    }

                    loadFile(file.id);
                });
            }

            filesList.appendChild(fileItem);
        });
    }

    function showRhymeModal() {
        rhymeModal.classList.add('show');

        const savedApiKey = localStorage.getItem('groq-api-key');
        if (savedApiKey) {
            rhymeWordInput.focus();
        } else {
            groqApiKeyInput.focus();
        }
    }

    function hideRhymeModal() {
        rhymeModal.classList.remove('show');

        rhymeWordInput.value = '';
        rhymeResults.innerHTML = '<div class="rhyme-results-placeholder">Enter a word above to get rhyme suggestions</div>';
    }

    async function getRhymeSuggestions() {
        const word = rhymeWordInput.value.trim();
        if (!word) return;

        const apiKey = localStorage.getItem('groq-api-key');
        if (!apiKey) {

            apiKeySection.style.display = 'block';
            rhymeSuggestionSection.style.display = 'none';
            return;
        }

        rhymeLoading.style.display = 'flex';
        rhymeResults.innerHTML = '';

        try {

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama3-8b-8192',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that provides rhyming words for songwriters and lyricists.'
                        },
                        {
                            role: 'user',
                            content: `Give me 5-7 words that rhyme with "${word}". Format the response as a simple JSON array of strings with ONLY the rhyming words. Do not include any explanation or additional text.`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 150
                })
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            let rhymes;

            try {

                const content = data.choices[0].message.content.trim();

                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                                  content.match(/```\s*([\s\S]*?)\s*```/) || 
                                  [null, content];

                const cleanJson = jsonMatch[1].replace(/[\n\r]/g, '').trim();
                rhymes = JSON.parse(cleanJson);

                if (!Array.isArray(rhymes)) {

                    const keys = Object.keys(rhymes);
                    if (keys.length === 1 && Array.isArray(rhymes[keys[0]])) {
                        rhymes = rhymes[keys[0]];
                    } else {
                        throw new Error("Response is not an array");
                    }
                }
            } catch (e) {
                console.error("Failed to parse JSON response:", e);

                const content = data.choices[0].message.content;
                rhymes = content.match(/"([^"]+)"/g)?.map(word => word.replace(/"/g, '')) || 
                        content.split(/[\s,\n]+/).filter(w => w.length > 1);
            }

            if (rhymes && rhymes.length > 0) {
                displayRhymes(rhymes);
            } else {
                rhymeResults.innerHTML = `<div class="rhyme-results-placeholder">No rhymes found for "${word}"</div>`;
            }
        } catch (error) {
            console.error('Error getting rhymes:', error);
            rhymeResults.innerHTML = `
                <div class="rhyme-error">
                    <span class="material-icons-round">error</span>
                    <span>Error retrieving rhymes. Please check your API key and try again.</span>
                </div>`;
        } finally {

            rhymeLoading.style.display = 'none';
        }
    }

    function displayRhymes(rhymes) {
        rhymeResults.innerHTML = '';

        rhymes.forEach(rhyme => {
            const suggestionEl = document.createElement('div');
            suggestionEl.className = 'rhyme-suggestion';

            suggestionEl.innerHTML = `
                <span class="rhyme-suggestion-word">${rhyme}</span>
                <button class="use-rhyme-btn" data-word="${rhyme}">
                    Use <span class="material-icons-round">add</span>
                </button>
            `;

            rhymeResults.appendChild(suggestionEl);
        });

        document.querySelectorAll('.use-rhyme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const word = btn.getAttribute('data-word');
                insertRhymeWord(word);
            });
        });
    }

    function insertRhymeWord(word) {
        if (!editor.value || editor.disabled) return;

        const position = editor.selectionEnd;

        const content = editor.value;
        const newContent = content.substring(0, position) + word + content.substring(position);

        editor.value = newContent;

        const newPosition = position + word.length;
        editor.setSelectionRange(newPosition, newPosition);

        const inputEvent = new Event('input', { bubbles: true });
        editor.dispatchEvent(inputEvent);

        hideRhymeModal();

        editor.focus();
    }

    init();
});