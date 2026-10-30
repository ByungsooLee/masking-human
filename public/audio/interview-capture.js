class InterviewCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = [];
    this.weight = 0;
    this.sum = 0;
  }
  process(inputs, outputs) {
    const source = inputs[0]?.[0];
    if (outputs[0]?.[0]) outputs[0][0].fill(0);
    if (!source) return true;
    const ratio = sampleRate / 16000;
    for (const sample of source) {
      let remaining = 1;
      while (remaining > 0.000001) {
        const portion = Math.min(remaining, ratio - this.weight);
        this.sum += sample * portion;
        this.weight += portion;
        remaining -= portion;
        if (this.weight >= ratio - 0.000001) {
          this.samples.push(this.sum / ratio);
          this.sum = 0;
          this.weight = 0;
        }
      }
    }
    if (this.samples.length >= 1024) {
      const frame = new Float32Array(this.samples);
      this.port.postMessage(frame, [frame.buffer]);
      this.samples = [];
    }
    return true;
  }
}
registerProcessor("interview-capture", InterviewCapture);
