import EventEmitter from 'events';
import {APNG, Frame, FrameAnim} from './structs';
export default class extends EventEmitter {
    /** @type {CanvasRenderingContext2D} */
    context;
    /** @type {number} */
    playbackRate = 1.0;

    /** @type {APNG} */
    _apng;
    /** @type {Frame} */
    _prevFrame;
    /** @type {ImageData} */
    _prevFrameData;
    /** @type {number} */
    _currentFrameNumber = 0;

    /** @type {boolean} */
    _ended = false;
    /** @type {boolean} */
    _paused = true;
    /** @type {number} */
    _numPlays = 0;
    /** @type {number} */
    _defaultFrameLength = 40;

    // talkr files will attempt to layer blink and eyebrow anims 
    // on top of the lip-sync animation. Non-talkr files will
    // simply ping-pong all frames.
    /** @type {boolean} */
    _is_talkr_file = false;

    /** @type {number} */
    _last_lipsync_frame_index = 0;

    /** @type {number} */
    _startIndex = 0;

    /** @type FrameAnim[] */
    _anims = [];



    /**
     * @param {APNG} apng
     * @param {CanvasRenderingContext2D} context
     * @param {boolean} autoPlay
     */
    constructor(apng, context, autoPlay) {
        super();
        this._apng = apng;
        this.context = context;

        if (!this._apng.isTalkrFile || this._apng.frames.length < 30 ) {
            // In order to play this non-talkr GIF file forwards and backwards, without
            // considering frame disposal options, we need to store the "full" frames
            // in memory so they can be displayed without knowing which frame came before.
            this.createFullFrames();
            this._last_lipsync_frame_index = this._apng.frames.length -1
            
        } else {
            this._last_lipsync_frame_index = 22
            this._startIndex = 1
        }

        this.stop();

        if (autoPlay) {
            this.play();
        }
    }

    /**
     *
     * @return {number}
     */
    get currentFrameNumber() {
        return this._currentFrameNumber;
    }

    /**
     *
     * @return {Frame}
     */
    get currentFrame() {
        return this._apng.frames[this._currentFrameNumber];
    }

    renderNextFrame() {
        this._currentFrameNumber = (this._currentFrameNumber + 1) % this._apng.frames.length;
        if (this._currentFrameNumber === this._apng.frames.length - 1) {
            this._numPlays++;
            if (this._apng.numPlays !== 0 && this._numPlays >= this._apng.numPlays) {
                this.emit('end');
                this._ended = true;
                this._paused = true;
            }
        }

        if (this._prevFrame && this._prevFrame.disposeOp == 1) {
            this.context.clearRect(this._prevFrame.left, this._prevFrame.top, this._prevFrame.width, this._prevFrame.height);
        } else if (this._prevFrame && this._prevFrame.disposeOp == 2) {
            this.context.putImageData(this._prevFrameData, this._prevFrame.left, this._prevFrame.top);
        }

        const frame = this.currentFrame;
        this._prevFrame = frame;
        this._prevFrameData = null;
        if (frame.disposeOp == 2) {
            this._prevFrameData = this.context.getImageData(frame.left, frame.top, frame.width, frame.height);
        }
        if (frame.blendOp == 0) {
            this.context.clearRect(frame.left, frame.top, frame.width, frame.height);
        }

        this.context.drawImage(frame.imageElement, frame.left, frame.top);
    }

    // playback

    get paused() { return this._paused; }

    get ended() { return this._ended; }

    play() {
        this.emit('play');

        if (this._ended) {
            this.stop();
        }
        this._paused = false;

        let nextRenderTime = performance.now() + this.currentFrame.delay / this.playbackRate;
        const tick = now => {
            if (this._ended || this._paused) {
                return;
            }
            if (now >= nextRenderTime) {
                while (now - nextRenderTime >= this._apng.playTime / this.playbackRate) {
                    nextRenderTime += this._apng.playTime / this.playbackRate;
                    this._numPlays++;
                }
                do {
                    this.renderNextFrame();
                    nextRenderTime += this.currentFrame.delay / this.playbackRate;
                } while (!this._ended && now > nextRenderTime);
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    pause() {
        if (!this._paused) {
            this.emit('pause');
            this._paused = true;
        }
    }

    // Non-talkr APNG files will need this to play in reverse 
    createFullFrames() {

        // full frame data contains the full data for the frame
        // as opposed to the data that needs to be applied to the previous frame 
        // (which was added to the frame before that, etc.)
        this._fullFrameData = []
        this._currentFrameNumber = -1;

        this.context.clearRect(0, 0, this._apng.width, this._apng.height);
        for (var i = 0; i < this._apng.frames.length; ++i) {
            this.renderNextFrame();
            var frame = this._apng.frames[i]
            this._fullFrameData.push(this.context.getImageData(0, 0, this._apng.width, this._apng.height));
        }
    }

    /**
     * @param {number} index
     */
    renderFullFrame(index) {
        index = index % this._apng.frames.length;
        if( index>=0){
            this.context.putImageData(this._fullFrameData[index], 0, 0);
        }
    }

    addAnimToPlay(anim){
        if(!anim || anim.length == 0) {
            return;
        }
        let newFrameAnim = new FrameAnim();
        newFrameAnim.fromFrames(anim)
        this._anims.push(newFrameAnim)
    }

    play_anims() {
        if( !this._ended ){
            // Interrupting current animation. Could be snaps was we swap out 
        }
        this._ended = false;
        this._paused = false;

        this._anims.forEach( (anim) => {
            if(anim.frames.length > 0){
                let animframe = anim.frames[0];
                anim.nextRenderTime = performance.now() + animframe[1] / this.playbackRate;
                anim.currentFrameIndex = animframe[0];   
            }
        });
        const drawF0 = () => {
            this.context.drawImage(this._apng.frames[0].imageElement, this._apng.frames[0].left, this._apng.frames[0].top);
            if (this._apng.isTalkrFile) {
                // The base image for talkr files includes frame 1 drawn over frame 0.  This allows frame 0 to represent
                // the original image, with an overlay on frame 1 to add things like teeth or other effects.
                this.context.drawImage(this._apng.frames[1].imageElement, this._apng.frames[1].left, this._apng.frames[1].top);
            }
        }
        const tick = now => {
            // @todo, support resuming from a paused animation.  Create resume function?
            if (this._ended || this._paused || this._anims.length == 0) {
                drawF0()
                return;
            }

            // Don't change the canvas if nothing changed.
            let refreshed = false;
            this._anims.forEach(function(anim){
                if(now >= anim.nextRenderTime ){
                    refreshed = true;
                }
            });
            let frames_to_draw = [];
            if(refreshed){
                for(let i = this._anims.length -1; i >= 0; --i){
                    let bDelete = this._anims[i].tick(now,  this.playbackRate)

                    if(bDelete){
                        this._anims.splice(i,1);
                    } else {
                        frames_to_draw.push(this._anims[i].currentFrameIndex)
                    }
                }
                // sort and remove duplicates.
                frames_to_draw = [...new Set(frames_to_draw)].sort( (a,b) => { return a-b;});

                if (!this._apng.isTalkrFile) {
                    // Non _talkr files just loop their full frames.  
                    this.renderFullFrame(frames_to_draw[frames_to_draw.length -1])
                } else {
                    this.context.clearRect(0, 0, this._apng.width, this._apng.height);
                    drawF0()
                    frames_to_draw.forEach(f => {
                        if(f>this._startIndex) {
                            this.context.drawImage(this._apng.frames[f].imageElement, this._apng.frames[f].left, this._apng.frames[f].top);
                        }
                    });
                }
            }
            if(this._anims.length == 0 ){
                this.emit('end');
                this._ended = true;
                this._paused = true;
                return;
            }         
            requestAnimationFrame(tick);    
        }
        requestAnimationFrame(tick);         
    }
    /**
     * @param {number} duration
     * @return {FrameAnim}     
     */    
    create_blink_anim(duration) {
        let rand = Math.random();
        if(rand < 0.3){
            return [];
        }
        if(rand < 0.6){
            return [[23, 50],[24, 50],[25, 50],[24, 50],[23, 50]];
        }
        return [[1,rand*duration],[23, 50],[24, 50],[25, 50],[24, 50],[23, 50]];
    }
    /**
     * @param {number} duration
     * @return {FrameAnim}     
     */     
    create_brow_anim(duration) {
        let rand = Math.random();
        if(rand < 0.3){
            return [];
        }
        if(rand < 0.6){
            return [[26, 50],[27, 50],[28, 50],[29, 100],[28, 80],[27, 80],[26, 80]];
        }
        // Hold eyebrows up for the entire short utterance.
        if(duration < 1000 ){
            return [[26, 50],[27, 50],[28, 50],[29, duration*0.9],[28, 80],[27, 80],[26, 80]]; 
        }
    }
    /**
     * @param {number} duration
     */       
    play_for_duration(dur) {
        let normalizedFrameTime = this._defaultFrameLength / this.playbackRate;
        let frames = [];
        
        let i = this._startIndex
        let reverse = false;
        let t = normalizedFrameTime;
        let lastNonZeroFrameTime = dur - normalizedFrameTime;

        while( t <= lastNonZeroFrameTime ){
            if (i === this._last_lipsync_frame_index || i === this._startIndex ) {
                reverse = i === this._last_lipsync_frame_index;
            }
            // Make sure we reverse in time to reach frame 1 before lastNonZeroFrameTime.
            if (!reverse && i > this._startIndex && t + i * normalizedFrameTime > lastNonZeroFrameTime) {
                reverse = true
            }
            let increment = reverse ? -1 : 1
            i += increment;
            frames.push([i, normalizedFrameTime]);
            t += normalizedFrameTime;
        }
        if( i != this._startIndex){
            frames.push([this._startIndex, normalizedFrameTime]);
        }
        this._anims = []

        this.addAnimToPlay(frames);
        
        if( this._apng.isTalkrFile ) {
            this.addAnimToPlay(this.create_blink_anim());
            this.addAnimToPlay(this.create_brow_anim());
        }
        
        this.play_anims();
    }

    stop() {
        this.emit('stop');
        this._numPlays = 0;
        this._ended = false;
        this._paused = true;
        // render first frame
        this._currentFrameNumber = -1;
        this.context.clearRect(0, 0, this._apng.width, this._apng.height);
        this.renderNextFrame();
    }
}