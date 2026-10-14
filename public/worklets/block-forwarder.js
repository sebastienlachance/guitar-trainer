// Runs on the audio thread: sends the microphone's samples to the page in batches of 512, each
// with the audio-clock time of its first sample. The timing analysis happens in the page, in
// src/app/core/audio/attack-timer.ts, where it's tested. Plain JavaScript: worklets are loaded
// by URL, outside the app's build.
const BATCH = 512;

class BlockForwarder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batch = new Float32Array(BATCH);
    this.filled = 0;
    this.batchTime = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      if (this.filled === 0) {
        this.batchTime = currentTime;
      }
      this.batch.set(channel, this.filled);
      this.filled += channel.length;
      if (this.filled >= BATCH) {
        this.port.postMessage({ time: this.batchTime, samples: this.batch });
        this.batch = new Float32Array(BATCH);
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor('block-forwarder', BlockForwarder);
