// Quasselo - Text-to-Speech Reader Application
// All functionality in Vanilla JavaScript

class Quasselo {
    constructor() {
        // State
        this.words = [];
        this.currentIndex = 0;
        this.isPrepared = false;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentSentenceStart = 0;
        this.currentSentenceEnd = 0;
        
        // TTS
        this.utterance = null;
        this.synth = window.speechSynthesis;
        
        // DOM Elements
        this.textName = document.getElementById('textName');
        this.textArea = document.getElementById('textArea');
        this.currentPosDisplay = document.getElementById('currentPos');
        this.totalWordsDisplay = document.getElementById('totalWords');
        this.jumpPositionInput = document.getElementById('jumpPosition');
        
        // Buttons
        this.btnClipboard = document.getElementById('btnClipboard');
        this.btnSave = document.getElementById('btnSave');
        this.btnPrepare = document.getElementById('btnPrepare');
        this.btnPrepareActive = document.getElementById('btnPrepareActive');
        this.btnExport = document.getElementById('btnExport');
        this.btnImport = document.getElementById('btnImport');
        this.btnDelete = document.getElementById('btnDelete');
        this.btnMenu = document.getElementById('btnMenu');
        this.btnHoren = document.getElementById('btnHoren');
        this.btnPlay = document.getElementById('btnPlay');
        this.btnStop = document.getElementById('btnStop');
        this.btnBegin = document.getElementById('btnBegin');
        this.btnPrev = document.getElementById('btnPrev');
        this.btnNext = document.getElementById('btnNext');
        this.btnEnd = document.getElementById('btnEnd');
        this.btnClose = document.getElementById('btnClose');
        
        this.fileInput = document.getElementById('fileInput');
        
        // Initialize
        this.attachEventListeners();
        this.updateUI();
    }
    
    attachEventListeners() {
        // Top bar buttons
        this.btnClipboard.addEventListener('click', () => this.loadFromClipboard());
        this.btnSave.addEventListener('click', () => this.saveAsText());
        this.btnPrepare.addEventListener('click', () => this.prepareText());
        this.btnExport.addEventListener('click', () => this.exportData());
        this.btnImport.addEventListener('click', () => this.importData());
        this.btnDelete.addEventListener('click', () => this.deleteAll());
        
        // Control bar buttons
        this.btnMenu.addEventListener('click', () => this.showMenu());
        this.btnHoren.addEventListener('click', () => this.startReading());
        this.btnPlay.addEventListener('click', () => this.togglePlayPause());
        this.btnStop.addEventListener('click', () => this.stopReading());
        this.btnBegin.addEventListener('click', () => this.jumpToSentenceStart());
        this.btnPrev.addEventListener('click', () => this.previousWord());
        this.btnNext.addEventListener('click', () => this.nextWord());
        this.btnEnd.addEventListener('click', () => this.jumpToSentenceEnd());
        this.btnClose.addEventListener('click', () => this.resetToStart());
        
        // Jump position input
        this.jumpPositionInput.addEventListener('change', () => this.jumpToPosition());
        this.jumpPositionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.jumpToPosition();
        });
        
        // File input
        this.fileInput.addEventListener('change', (e) => this.handleFileImport(e));
        
        // Text area - disable editing when prepared
        this.textArea.addEventListener('input', () => {
            if (this.isPrepared) {
                this.isPrepared = false;
                this.updateUI();
            }
        });
    }
    
    // ===== TEXT HANDLING =====
    
    async loadFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            if (text.trim()) {
                this.textArea.textContent = text;
                this.showMessage('✓ Text aus Clipboard geladen');
            } else {
                this.showMessage('⚠ Clipboard ist leer');
            }
        } catch (err) {
            this.showMessage('✗ Clipboard-Zugriff verweigert. Bitte Text manuell einfügen.');
            console.error('Clipboard error:', err);
        }
    }
    
    saveAsText() {
        const text = this.textArea.textContent;
        const filename = this.textName.value.trim() || 'quasselo-text';
        
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename + '.txt';
        a.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('✓ Text als TXT gespeichert');
    }
    
    prepareText() {
        const text = this.textArea.textContent.trim();
        
        if (!text) {
            this.showMessage('⚠ Kein Text vorhanden');
            return;
        }
        
        // Split text into words (remove multiple spaces and newlines)
        this.words = text
            .split(/\s+/)
            .filter(word => word.length > 0);
        
        this.currentIndex = 0;
        this.isPrepared = true;
        this.calculateSentenceBoundaries();
        
        this.totalWordsDisplay.textContent = this.words.length;
        this.currentPosDisplay.textContent = '0';
        this.jumpPositionInput.max = this.words.length;
        
        this.updateUI();
        this.showMessage(`✓ Text aufbereitet: ${this.words.length} Wörter`);
    }
    
    calculateSentenceBoundaries() {
        if (this.currentIndex >= this.words.length) return;
        
        // Find sentence start (backwards from current position)
        this.currentSentenceStart = this.currentIndex;
        for (let i = this.currentIndex - 1; i >= 0; i--) {
            const word = this.words[i];
            if (word.match(/[.!?]$/)) {
                this.currentSentenceStart = i + 1;
                break;
            }
            if (i === 0) {
                this.currentSentenceStart = 0;
            }
        }
        
        // Find sentence end (forwards from current position)
        this.currentSentenceEnd = this.currentIndex;
        for (let i = this.currentIndex; i < this.words.length; i++) {
            const word = this.words[i];
            if (word.match(/[.!?]$/)) {
                this.currentSentenceEnd = i;
                break;
            }
            if (i === this.words.length - 1) {
                this.currentSentenceEnd = i;
            }
        }
    }
    
    deleteAll() {
        if (confirm('Wirklich alles löschen?')) {
            this.textName.value = '';
            this.textArea.textContent = '';
            this.words = [];
            this.currentIndex = 0;
            this.isPrepared = false;
            this.stopReading();
            this.updateUI();
            this.showMessage('✓ Alles gelöscht');
        }
    }
    
    // ===== IMPORT/EXPORT =====
    
    async exportData() {
        if (!this.isPrepared) {
            this.showMessage('⚠ Text muss erst aufbereitet werden');
            return;
        }
        
        const data = {
            name: this.textName.value.trim() || 'unbenannt',
            text: this.textArea.textContent,
            words: this.words,
            version: '1.0'
        };
        
        const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        
        // Create ZIP using JSZip (we'll use a simple approach with just JSON for now)
        // In production, you'd want to include JSZip library
        const filename = data.name + '_quasselo.json';
        const url = URL.createObjectURL(jsonBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('✓ Daten exportiert');
    }
    
    importData() {
        this.fileInput.click();
    }
    
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.name) this.textName.value = data.name;
            if (data.text) this.textArea.textContent = data.text;
            if (data.words && Array.isArray(data.words)) {
                this.words = data.words;
                this.isPrepared = true;
                this.currentIndex = 0;
                this.totalWordsDisplay.textContent = this.words.length;
                this.currentPosDisplay.textContent = '0';
                this.calculateSentenceBoundaries();
            }
            
            this.updateUI();
            this.showMessage('✓ Daten importiert');
        } catch (err) {
            this.showMessage('✗ Import fehlgeschlagen');
            console.error('Import error:', err);
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    // ===== TEXT-TO-SPEECH =====
    
    startReading() {
        if (!this.isPrepared) {
            this.showMessage('⚠ Text muss erst aufbereitet werden');
            return;
        }
        
        this.currentIndex = 0;
        this.calculateSentenceBoundaries();
        this.isPlaying = true;
        this.isPaused = false;
        this.speakCurrentWord();
        this.updateUI();
    }
    
    togglePlayPause() {
        if (!this.isPrepared) {
            this.showMessage('⚠ Text muss erst aufbereitet werden');
            return;
        }
        
        if (!this.isPlaying && !this.isPaused) {
            // Start fresh
            this.isPlaying = true;
            this.speakCurrentWord();
        } else if (this.isPlaying) {
            // Pause
            this.synth.pause();
            this.isPaused = true;
            this.isPlaying = false;
        } else if (this.isPaused) {
            // Resume
            this.synth.resume();
            this.isPaused = false;
            this.isPlaying = true;
        }
        
        this.updateUI();
    }
    
    stopReading() {
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.currentIndex = 0;
        this.currentPosDisplay.textContent = '0';
        this.highlightWord(null);
        this.updateUI();
    }
    
    speakCurrentWord() {
        if (this.currentIndex >= this.words.length) {
            this.stopReading();
            this.showMessage('✓ Vorlesen beendet');
            return;
        }
        
        const word = this.words[this.currentIndex];
        this.currentPosDisplay.textContent = this.currentIndex + 1;
        this.highlightWord(this.currentIndex);
        
        // Cancel any ongoing speech
        this.synth.cancel();
        
        // Create new utterance
        this.utterance = new SpeechSynthesisUtterance(word);
        this.utterance.lang = 'de-DE';
        this.utterance.rate = 0.9;
        this.utterance.pitch = 1;
        
        this.utterance.onend = () => {
            if (this.isPlaying) {
                this.currentIndex++;
                this.calculateSentenceBoundaries();
                setTimeout(() => this.speakCurrentWord(), 300);
            }
        };
        
        this.utterance.onerror = (err) => {
            console.error('Speech error:', err);
            this.isPlaying = false;
            this.updateUI();
        };
        
        this.synth.speak(this.utterance);
    }
    
    // ===== NAVIGATION =====
    
    previousWord() {
        if (!this.isPrepared) return;
        
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.calculateSentenceBoundaries();
            this.currentPosDisplay.textContent = this.currentIndex + 1;
            
            // Speak the word
            this.speakSingleWord();
        }
    }
    
    nextWord() {
        if (!this.isPrepared) return;
        
        if (this.currentIndex < this.words.length - 1) {
            this.currentIndex++;
            this.calculateSentenceBoundaries();
            this.currentPosDisplay.textContent = this.currentIndex + 1;
            
            // Speak the word
            this.speakSingleWord();
        }
    }
    
    jumpToSentenceStart() {
        if (!this.isPrepared) return;
        
        this.calculateSentenceBoundaries();
        this.currentIndex = this.currentSentenceStart;
        this.currentPosDisplay.textContent = this.currentIndex + 1;
        this.speakSingleWord();
    }
    
    jumpToSentenceEnd() {
        if (!this.isPrepared) return;
        
        this.calculateSentenceBoundaries();
        this.currentIndex = this.currentSentenceEnd;
        this.currentPosDisplay.textContent = this.currentIndex + 1;
        this.speakSingleWord();
    }
    
    jumpToPosition() {
        if (!this.isPrepared) return;
        
        const pos = parseInt(this.jumpPositionInput.value);
        if (isNaN(pos) || pos < 1 || pos > this.words.length) {
            this.showMessage('⚠ Ungültige Position');
            return;
        }
        
        this.currentIndex = pos - 1;
        this.calculateSentenceBoundaries();
        this.currentPosDisplay.textContent = this.currentIndex + 1;
        this.speakSingleWord();
        this.jumpPositionInput.value = '';
    }
    
    resetToStart() {
        this.currentIndex = 0;
        this.calculateSentenceBoundaries();
        this.currentPosDisplay.textContent = '0';
        this.highlightWord(null);
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.updateUI();
    }
    
    speakSingleWord() {
        if (this.currentIndex >= this.words.length) return;
        
        const word = this.words[this.currentIndex];
        this.highlightWord(this.currentIndex);
        
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'de-DE';
        utterance.rate = 0.9;
        this.synth.speak(utterance);
    }
    
    // ===== UI UPDATES =====
    
    highlightWord(index) {
        // Remove existing highlights
        const highlighted = this.textArea.querySelectorAll('.highlight');
        highlighted.forEach(el => {
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
        });
        
        if (index === null || !this.isPrepared) return;
        
        // Add new highlight
        const text = this.textArea.textContent;
        let wordCount = 0;
        let charIndex = 0;
        
        for (let i = 0; i < text.length; i++) {
            if (text[i].match(/\S/) && (i === 0 || text[i-1].match(/\s/))) {
                if (wordCount === index) {
                    charIndex = i;
                    break;
                }
                wordCount++;
            }
        }
        
        const wordLength = this.words[index].length;
        const beforeText = text.substring(0, charIndex);
        const highlightText = text.substring(charIndex, charIndex + wordLength);
        const afterText = text.substring(charIndex + wordLength);
        
        this.textArea.innerHTML = '';
        this.textArea.appendChild(document.createTextNode(beforeText));
        
        const span = document.createElement('span');
        span.className = 'highlight';
        span.textContent = highlightText;
        this.textArea.appendChild(span);
        
        this.textArea.appendChild(document.createTextNode(afterText));
        
        // Scroll to highlighted word
        span.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    updateUI() {
        // Show/hide prepare buttons
        if (this.isPrepared) {
            this.btnPrepare.style.display = 'none';
            this.btnPrepareActive.style.display = 'inline-block';
        } else {
            this.btnPrepare.style.display = 'inline-block';
            this.btnPrepareActive.style.display = 'none';
        }
        
        // Enable/disable controls
        const needsPrepared = [
            this.btnHoren, this.btnPlay, this.btnStop,
            this.btnBegin, this.btnPrev, this.btnNext,
            this.btnEnd, this.btnClose, this.btnExport
        ];
        
        needsPrepared.forEach(btn => {
            btn.disabled = !this.isPrepared;
        });
        
        this.jumpPositionInput.disabled = !this.isPrepared;
    }
    
    showMenu() {
        alert('Menü-Funktion noch nicht implementiert');
    }
    
    showMessage(message) {
        // Simple message display
        console.log(message);
        
        // You could add a toast notification here
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 14px;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
        }, 2500);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Quasselo();
    });
} else {
    new Quasselo();
}