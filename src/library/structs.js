import Player from './player';

/**
 * @property {number} currFrameNumber
 * @property {Frame} currFrame
 * @property {boolean} paused
 * @property {boolean} ended
 * @property {boolean} isTalkrFile
 */
export class APNG {
    /** @type {number} */
    width = 0;
    /** @type {number} */
    height = 0;
    /** @type {number} */
    numPlays = 0;
    /** @type {number} */
    playTime = 0;
    /** @type {Frame[]} */
    frames = [];

    /**
     *
     * @return {Promise.<*>}
     */
    createImages() {
        return Promise.all(this.frames.map(f => f.createImage()));
    }

    /**
     *
     * @param {CanvasRenderingContext2D} context
     * @param {boolean} autoPlay
     * @return {Promise.<Player>}
     */
    getPlayer(context, autoPlay = false) {
        return this.createImages().then(() => new Player(this, context, autoPlay));
    }
}

export class Frame {
    /** @type {number} */
    left = 0;
    /** @type {number} */
    top = 0;
    /** @type {number} */
    width = 0;
    /** @type {number} */
    height = 0;
    /** @type {number} */
    delay = 0;
    /** @type {number} */
    disposeOp = 0;
    /** @type {number} */
    blendOp = 0;
    /** @type {Blob} */
    imageData = null;
    /** @type {HTMLImageElement} */
    imageElement = null;

    createImage() {
        if (this.imageElement) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(this.imageData);
            this.imageElement = document.createElement('img');
            this.imageElement.onload = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            this.imageElement.onerror = () => {
                URL.revokeObjectURL(url);
                this.imageElement = null;
                reject(new Error("Image creation error"));
            };
            this.imageElement.src = url;
        });
    }
}


/**
 * @property {[number[]]} frames
 * @property {number} nextRenderTime
 * @property {number} currentFrameIndex
 */
export class FrameAnim {
     /** @type {[number[]]} */
    frames = [];
    
    nextRenderTime = 0;
    currentFrameIndex = 0;

    fromArray(array, defaultVal){
        this.frames = [];
        array.forEach( f => {frames.push(f, defaultVal)});
    }

    fromFrames(frames){
        this.frames = [];

        // Make a copy
        var framesCopy =  frames.map(function(arr) {
            return arr.slice();
        });     
        frames.forEach(function(frame){
            if (!Array.isArray(frame)  ) {
                throw new Error('Error.  Animation must be array of arrays. [[i,dur]..]');
            }
        }); 
        this.frames = framesCopy;
    }

    // Ticks the animation to the current time.
    // Returns true if the animation has finished.
    tick(now, playbackRate){
        while ( now >= this.nextRenderTime && this.frames.length > 0){
            let framedata = this.frames.shift();
            this.currentFrameIndex = framedata[0];
            this.nextRenderTime =  this.nextRenderTime + framedata[1] / playbackRate;
        }
        return now >= this.nextRenderTime && this.frames.length == 0;
    }
}

