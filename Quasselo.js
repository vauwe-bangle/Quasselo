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
        this.speechRate = 0.9; // Speech speed
        this.voiceGender = 'female'; // Voice gender preference
        
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
        this.btnRepeat = document.getElementById('btnRepeat');
        this.btnEnd = document.getElementById('btnEnd');
        this.btnClose = document.getElementById('btnClose');
        
        // Settings Modal
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettings');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.voiceFemaleBtn = document.getElementById('voiceFemale');
        this.voiceMaleBtn = document.getElementById('voiceMale');
        
        this.fileInput = document.getElementById('fileInput');
        
        // Initialize
        this.attachEventListeners();
        this.updateUI();
        
        // Load voices (needed for voice selection)
        // Mobile browsers need special handling
        this.voicesLoaded = false;
        this.loadVoices();
        
        // Listen for voices changed event (important for mobile)
        if ('speechSynthesis' in window) {
            this.synth.addEventListener('voiceschanged', () => {
                this.loadVoices();
            });
        }
    }
    
    loadVoices() {
        const voices = this.synth.getVoices();
        if (voices.length > 0) {
            this.voicesLoaded = true;
            console.log('Voices loaded:', voices.length);
            console.log('Available German voices:', voices.filter(v => v.lang.startsWith('de')));
        }
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
        
        // Add touch events for mobile (with preventDefault to avoid double-firing)
        this.btnPlay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.togglePlayPause();
        }, { passive: false });
        
        this.btnBegin.addEventListener('click', () => this.jumpToSentenceStart());
        this.btnPrev.addEventListener('click', () => this.previousWord());
        this.btnNext.addEventListener('click', () => this.nextWord());
        this.btnRepeat.addEventListener('click', () => this.repeatWord());
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
        
        // Settings Modal
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });
        this.speedSlider.addEventListener('input', (e) => {
            this.speechRate = parseFloat(e.target.value);
            this.speedValue.textContent = this.speechRate.toFixed(1);
        });
        
        // Voice selection buttons - mobile-first approach
        const selectFemaleVoice = () => {
            this.voiceGender = 'female';
            this.voiceFemaleBtn.classList.add('active');
            this.voiceMaleBtn.classList.remove('active');
            console.log('Voice set to: female');
            this.showMessage('👩 Weibliche Stimme ausgewählt');
        };
        
        const selectMaleVoice = () => {
            this.voiceGender = 'male';
            this.voiceMaleBtn.classList.add('active');
            this.voiceFemaleBtn.classList.remove('active');
            console.log('Voice set to: male');
            this.showMessage('👨 Männliche Stimme ausgewählt');
        };
        
        // Click events
        this.voiceFemaleBtn.addEventListener('click', selectFemaleVoice);
        this.voiceMaleBtn.addEventListener('click', selectMaleVoice);
        
        // Touch events for mobile (prevent both from firing)
        this.voiceFemaleBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectFemaleVoice();
        }, { passive: false });
        
        this.voiceMaleBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectMaleVoice();
        }, { passive: false });
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
        this.speakEntireText();
        this.updateUI();
    }
    
    togglePlayPause() {
        if (!this.isPrepared) {
            this.showMessage('⚠ Text muss erst aufbereitet werden');
            return;
        }
        
        if (!this.isPlaying && !this.isPaused) {
            // Start fresh from current position
            this.isPlaying = true;
            this.speakEntireText();
        } else if (this.isPlaying) {
            // Pause - save current word index
            this.synth.pause();
            this.isPaused = true;
            this.isPlaying = false;
        } else if (this.isPaused) {
            // Resume from paused position
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
    
    speakEntireText() {
        if (this.currentIndex >= this.words.length) {
            this.stopReading();
            this.showMessage('✓ Vorlesen beendet');
            return;
        }
        
        // Get remaining text from current position
        const remainingText = this.words.slice(this.currentIndex).join(' ');
        
        // Cancel any ongoing speech
        this.synth.cancel();
        
        // Create new utterance for entire remaining text
        this.utterance = new SpeechSynthesisUtterance(remainingText);
        this.utterance.lang = 'de-DE';
        this.utterance.rate = this.speechRate;
        this.utterance.pitch = 1;
        
        // Set preferred voice
        const preferredVoice = this.getPreferredVoice();
        if (preferredVoice) {
            this.utterance.voice = preferredVoice;
        }
        
        // Track word boundaries for highlighting
        let wordBoundaryIndex = this.currentIndex;
        
        this.utterance.onboundary = (event) => {
            if (event.name === 'word' && wordBoundaryIndex < this.words.length) {
                this.highlightWord(wordBoundaryIndex);
                this.currentPosDisplay.textContent = wordBoundaryIndex + 1;
                this.currentIndex = wordBoundaryIndex;
                wordBoundaryIndex++;
                this.calculateSentenceBoundaries();
            }
        };
        
        this.utterance.onend = () => {
            if (this.isPlaying) {
                this.currentIndex = this.words.length;
                this.stopReading();
                this.showMessage('✓ Vorlesen beendet');
            }
        };
        
        this.utterance.onpause = () => {
            // When paused, currentIndex is already set via onboundary
            console.log('Paused at word index:', this.currentIndex);
        };
        
        this.utterance.onresume = () => {
            console.log('Resumed from word index:', this.currentIndex);
        };
        
        this.utterance.onerror = (err) => {
            console.error('Speech error:', err);
            this.isPlaying = false;
            this.updateUI();
        };
        
        this.synth.speak(this.utterance);
    }
    
    // Legacy function kept for single word navigation
    speakCurrentWord() {
        if (this.currentIndex >= this.words.length) {
            this.stopReading();
            this.showMessage('✓ Vorlesen beendet');
            return;
        }
        
        // Determine how many words to speak together based on pause duration
        // Shorter pause = more words together = more fluent
        let wordsToSpeak = 1;
        if (this.pauseDuration <= 300) {
            wordsToSpeak = 5; // Very fluent
        } else if (this.pauseDuration <= 600) {
            wordsToSpeak = 3; // Medium fluent
        } else if (this.pauseDuration <= 1000) {
            wordsToSpeak = 2; // Less fluent
        } else {
            wordsToSpeak = 1; // Word by word
        }
        
        // Get the words to speak
        const endIndex = Math.min(this.currentIndex + wordsToSpeak, this.words.length);
        const textToSpeak = this.words.slice(this.currentIndex, endIndex).join(' ');
        
        this.currentPosDisplay.textContent = this.currentIndex + 1;
        this.highlightWord(this.currentIndex);
        
        // Cancel any ongoing speech
        this.synth.cancel();
        
        // Create new utterance
        this.utterance = new SpeechSynthesisUtterance(textToSpeak);
        this.utterance.lang = 'de-DE';
        this.utterance.rate = this.speechRate;
        this.utterance.pitch = 1;
        
        // Track word boundaries for highlighting during speech
        let wordBoundaryIndex = this.currentIndex;
        this.utterance.onboundary = (event) => {
            if (event.name === 'word' && wordBoundaryIndex < endIndex) {
                this.highlightWord(wordBoundaryIndex);
                this.currentPosDisplay.textContent = wordBoundaryIndex + 1;
                wordBoundaryIndex++;
            }
        };
        
        this.utterance.onend = () => {
            if (this.isPlaying) {
                this.currentIndex = endIndex;
                this.calculateSentenceBoundaries();
                
                // Small pause between chunks (only for word-by-word mode)
                const chunkPause = wordsToSpeak === 1 ? this.pauseDuration : 100;
                setTimeout(() => this.speakCurrentWord(), chunkPause);
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
        
        // Stop current playback
        const wasPlaying = this.isPlaying;
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.calculateSentenceBoundaries();
            this.currentPosDisplay.textContent = this.currentIndex + 1;
            
            // Speak the word
            this.speakSingleWord();
        }
        
        this.updateUI();
    }
    
    nextWord() {
        if (!this.isPrepared) return;
        
        // Stop current playback
        const wasPlaying = this.isPlaying;
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        
        if (this.currentIndex < this.words.length - 1) {
            this.currentIndex++;
            this.calculateSentenceBoundaries();
            this.currentPosDisplay.textContent = this.currentIndex + 1;
            
            // Speak the word
            this.speakSingleWord();
        }
        
        this.updateUI();
    }
    
    repeatWord() {
        if (!this.isPrepared) return;
        
        // Stop current playback
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        
        // Simply speak the current word again
        this.currentPosDisplay.textContent = this.currentIndex + 1;
        this.speakSingleWord();
        
        this.updateUI();
    }
    
    jumpToSentenceStart() {
        if (!this.isPrepared) return;
        
        // Stop current playback
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        
        this.calculateSentenceBoundaries();
        this.currentIndex = this.currentSentenceStart;
        this.currentPosDisplay.textContent = this.currentIndex + 1;
        this.speakSingleWord();
        
        this.updateUI();
    }
    
    jumpToSentenceEnd() {
        if (!this.isPrepared) return;
        
        // Stop current playback
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        
        this.calculateSentenceBoundaries();
        this.currentIndex = this.currentSentenceEnd;
        this.currentPosDisplay.textContent = this.currentIndex + 1;
        this.speakSingleWord();
        
        this.updateUI();
    }
    
    jumpToPosition() {
        if (!this.isPrepared) return;
        
        const pos = parseInt(this.jumpPositionInput.value);
        if (isNaN(pos) || pos < 1 || pos > this.words.length) {
            this.showMessage('⚠ Ungültige Position');
            return;
        }
        
        // Stop current playback
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        
        this.currentIndex = pos - 1;
        this.calculateSentenceBoundaries();
        this.currentPosDisplay.textContent = this.currentIndex + 1;
        this.speakSingleWord();
        this.jumpPositionInput.value = '';
        
        this.updateUI();
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
        utterance.rate = this.speechRate;
        
        // Set preferred voice
        const preferredVoice = this.getPreferredVoice();
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
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
        
        // Update Play/Pause button appearance
        this.btnPlay.classList.remove('playing', 'paused');
        if (this.isPlaying) {
            this.btnPlay.classList.add('playing');
            this.btnPlay.title = 'Pause';
        } else if (this.isPaused) {
            this.btnPlay.classList.add('paused');
            this.btnPlay.title = 'Fortsetzen';
        } else {
            this.btnPlay.title = 'Play';
        }
        
        // Enable/disable controls
        const needsPrepared = [
            this.btnHoren, this.btnPlay, this.btnStop,
            this.btnBegin, this.btnPrev, this.btnNext, this.btnRepeat,
            this.btnEnd, this.btnClose, this.btnExport
        ];
        
        needsPrepared.forEach(btn => {
            btn.disabled = !this.isPrepared;
        });
        
        this.jumpPositionInput.disabled = !this.isPrepared;
    }
    
    showMenu() {
        this.settingsModal.classList.add('show');
        
        // Show available voices for debugging on mobile
        setTimeout(() => {
            const voices = this.synth.getVoices();
            const germanVoices = voices.filter(v => v.lang.startsWith('de'));
            console.log('=== VOICE DEBUG ===');
            console.log('Total voices:', voices.length);
            console.log('German voices:', germanVoices.length);
            console.log('Current gender:', this.voiceGender);
            germanVoices.forEach(v => {
                console.log(`- ${v.name} (${v.lang}) ${v.default ? '[DEFAULT]' : ''}`);
            });
        }, 100);
    }
    
    closeSettings() {
        this.settingsModal.classList.remove('show');
    }
    
    getPreferredVoice() {
        const voices = this.synth.getVoices();
        
        if (voices.length === 0) {
            console.warn('No voices available yet');
            return null;
        }
        
        // Filter for German voices - try multiple patterns
        let germanVoices = voices.filter(voice => 
            voice.lang.startsWith('de-') || 
            voice.lang === 'de' ||
            voice.lang.startsWith('DE')
        );
        
        console.log('=== VOICE SELECTION ===');
        console.log('Total voices:', voices.length);
        console.log('German voices found:', germanVoices.length);
        console.log('Requested gender:', this.voiceGender);
        
        if (germanVoices.length === 0) {
            console.warn('No German voices found, using first available voice');
            return voices[0];
        }
        
        // List all German voices for debugging
        germanVoices.forEach((v, i) => {
            console.log(`${i}: ${v.name} (${v.lang})`);
        });
        
        let preferredVoice;
        
        if (this.voiceGender === 'female') {
            // Try multiple strategies to find female voice
            
            // Strategy 1: Explicit female markers
            preferredVoice = germanVoices.find(voice => {
                const nameLower = voice.name.toLowerCase();
                return nameLower.includes('female') ||
                       nameLower.includes('frau') ||
                       nameLower.includes('woman');
            });
            
            // Strategy 2: Common female names
            if (!preferredVoice) {
                preferredVoice = germanVoices.find(voice => {
                    const nameLower = voice.name.toLowerCase();
                    return nameLower.includes('anna') ||
                           nameLower.includes('helena') ||
                           nameLower.includes('petra') ||
                           nameLower.includes('katja') ||
                           nameLower.includes('vicki') ||
                           nameLower.includes('marlene') ||
                           nameLower.includes('hedda') ||
                           nameLower.includes('sabina');
                });
            }
            
            // Strategy 3: Default German voice (usually female)
            if (!preferredVoice) {
                preferredVoice = germanVoices.find(voice => voice.default);
            }
            
            // Strategy 4: Avoid male voices
            if (!preferredVoice) {
                preferredVoice = germanVoices.find(voice => {
                    const nameLower = voice.name.toLowerCase();
                    return !nameLower.includes('male') &&
                           !nameLower.includes('mann') &&
                           !nameLower.includes('hans') &&
                           !nameLower.includes('markus') &&
                           !nameLower.includes('stefan');
                });
            }
            
            // Strategy 5: First German voice
            if (!preferredVoice) {
                preferredVoice = germanVoices[0];
            }
            
        } else {
            // Male voice selection
            
            // Strategy 1: Explicit male markers
            preferredVoice = germanVoices.find(voice => {
                const nameLower = voice.name.toLowerCase();
                return nameLower.includes('male') ||
                       nameLower.includes('mann') ||
                       nameLower.includes('man');
            });
            
            // Strategy 2: Common male names
            if (!preferredVoice) {
                preferredVoice = germanVoices.find(voice => {
                    const nameLower = voice.name.toLowerCase();
                    return nameLower.includes('hans') ||
                           nameLower.includes('markus') ||
                           nameLower.includes('stefan') ||
                           nameLower.includes('dieter') ||
                           nameLower.includes('daniel');
                });
            }
            
            // Strategy 3: Last German voice (often male on some systems)
            if (!preferredVoice && germanVoices.length > 1) {
                preferredVoice = germanVoices[germanVoices.length - 1];
            }
            
            // Strategy 4: Fallback to first
            if (!preferredVoice) {
                preferredVoice = germanVoices[0];
            }
        }
        
        console.log('✓ Selected voice:', preferredVoice.name, '(', preferredVoice.lang, ')');
        return preferredVoice;
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