/**
 * GIF Recorder Module
 * Records the simulation canvas as an animated GIF
 */

export class GifRecorder {
    constructor(options = {}) {
        this.canvas = options.canvas;
        this.width = options.width || 800;
        this.height = options.height || 600;
        this.quality = options.quality || 10; // 1-30, lower is better quality
        this.frameDelay = options.frameDelay || 100; // ms between frames
        this.workerScript = options.workerScript || 'src/recording/gif.worker.js';
        
        this.gif = null;
        this.isRecording = false;
        this.frameCount = 0;
        this.maxFrames = options.maxFrames || 300; // Max ~30 seconds at 10fps
        this.onProgress = options.onProgress || (() => {});
        this.onFinished = options.onFinished || (() => {});
        this.onError = options.onError || ((err) => console.error('GIF Error:', err));
        
        // Recording state
        this.startTime = 0;
        this.recordingDuration = 0;
        
        // Frame capture settings
        this.captureInterval = null;
        this.fps = options.fps || 10;
    }
    
    /**
     * Initialize GIF.js library
     */
    async init() {
        // Check if GIF is available globally
        if (typeof GIF === 'undefined') {
            throw new Error('GIF.js library not loaded. Include it in your HTML.');
        }
        return true;
    }
    
    /**
     * Start recording
     * @param {HTMLCanvasElement} canvas - The canvas to record
     */
    startRecording(canvas) {
        if (this.isRecording) {
            console.warn('Already recording');
            return;
        }
        
        this.canvas = canvas || this.canvas;
        if (!this.canvas) {
            this.onError(new Error('No canvas provided'));
            return;
        }
        
        // Create new GIF encoder
        this.gif = new GIF({
            workers: 2,
            quality: this.quality,
            width: this.canvas.width,
            height: this.canvas.height,
            workerScript: this.workerScript,
            transparent: null,
            background: '#000000'
        });
        
        // Set up event handlers
        this.gif.on('progress', (p) => {
            this.onProgress({
                phase: 'encoding',
                progress: p,
                message: `Encoding: ${Math.round(p * 100)}%`
            });
        });
        
        this.gif.on('finished', (blob) => {
            this.downloadGif(blob);
            this.onFinished({
                blob: blob,
                frameCount: this.frameCount,
                duration: this.recordingDuration
            });
        });
        
        this.isRecording = true;
        this.frameCount = 0;
        this.startTime = performance.now();
        
        // Start capturing frames at specified FPS
        const frameInterval = 1000 / this.fps;
        this.captureInterval = setInterval(() => {
            this.captureFrame();
        }, frameInterval);
        
        console.log(`GIF recording started at ${this.fps} FPS`);
        this.onProgress({
            phase: 'recording',
            progress: 0,
            message: 'Recording started...'
        });
    }
    
    /**
     * Capture a single frame
     */
    captureFrame() {
        if (!this.isRecording || !this.gif || !this.canvas) return;
        
        // Check frame limit
        if (this.frameCount >= this.maxFrames) {
            console.log('Max frames reached, stopping recording');
            this.stopRecording();
            return;
        }
        
        try {
            // Add frame to GIF
            this.gif.addFrame(this.canvas, {
                delay: this.frameDelay,
                copy: true
            });
            
            this.frameCount++;
            this.recordingDuration = (performance.now() - this.startTime) / 1000;
            
            // Update progress
            this.onProgress({
                phase: 'recording',
                progress: this.frameCount / this.maxFrames,
                message: `Recording: ${this.frameCount} frames (${this.recordingDuration.toFixed(1)}s)`,
                frameCount: this.frameCount,
                duration: this.recordingDuration
            });
        } catch (err) {
            console.error('Error capturing frame:', err);
        }
    }
    
    /**
     * Stop recording and render the GIF
     */
    stopRecording() {
        if (!this.isRecording) {
            console.warn('Not currently recording');
            return;
        }
        
        // Stop frame capture
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }
        
        this.isRecording = false;
        this.recordingDuration = (performance.now() - this.startTime) / 1000;
        
        console.log(`Recording stopped. ${this.frameCount} frames captured over ${this.recordingDuration.toFixed(1)}s`);
        
        this.onProgress({
            phase: 'encoding',
            progress: 0,
            message: 'Processing GIF...'
        });
        
        // Render the GIF
        if (this.gif && this.frameCount > 0) {
            this.gif.render();
        } else {
            this.onError(new Error('No frames captured'));
        }
    }
    
    /**
     * Cancel recording without saving
     */
    cancelRecording() {
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }
        
        this.isRecording = false;
        this.gif = null;
        this.frameCount = 0;
        
        console.log('Recording cancelled');
    }
    
    /**
     * Download the generated GIF
     * @param {Blob} blob - The GIF blob
     */
    downloadGif(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = `redshift-simulation-${timestamp}.gif`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        console.log('GIF downloaded:', link.download);
    }
    
    /**
     * Check if currently recording
     */
    getIsRecording() {
        return this.isRecording;
    }
    
    /**
     * Get recording stats
     */
    getStats() {
        return {
            isRecording: this.isRecording,
            frameCount: this.frameCount,
            duration: this.recordingDuration,
            maxFrames: this.maxFrames
        };
    }
    
    /**
     * Dispose resources
     */
    dispose() {
        this.cancelRecording();
        this.gif = null;
        this.canvas = null;
    }
}

