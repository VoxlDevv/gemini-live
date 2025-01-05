import wav from "node-wav";

export function pcm_to_wav(
  pcm: Buffer,
  sample_rate: number,
  bit_depth: number,
  volume_multiplier: number = 1.0,
) {
  const f32_arr = new Float32Array(pcm.length / 2);
  let idx = 0;
  while (idx < f32_arr.length) {
    const sample = pcm.readInt16LE(idx * 2);
    const amplified = (sample / 32768.0) * volume_multiplier;
    const compressed =
      Math.sign(amplified) * Math.min(Math.abs(amplified), 1.0);
    f32_arr[idx] = compressed;
    idx++;
  }

  // Using any[] to satisfy tsup build requirements, sorry :(
  return Buffer.from(
    wav.encode([f32_arr] as any[], {
      sampleRate: sample_rate,
      float: false,
      bitDepth: bit_depth,
    }),
  );
}
