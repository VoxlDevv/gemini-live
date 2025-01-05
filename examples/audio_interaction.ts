/**
 * This example demonstrates how to use Gemini Live to converse with
 * an AI assistant using audio.
 *
 * To run this example, you will need to have a Gemini Live account and obtain
 * an API key. You can sign up for a free account at https://aistudio.google.com/.
 *
 * Once you have your API key, replace "YOUR_API_KEY" with your actual API key
 *
 * Make sure you have the necessary dependencies installed:
 *   - arecord (for recording audio)
 */

import { spawn } from "child_process";
import { GeminiLive } from "../src";

const API_KEY = "AIzaSyABSDLMhpWB2ZmuxNgIOKyu1SbNTSbJbjU"; // Replace with your API key

let acord_recorder: ReturnType<typeof spawn> | null = null;
const client = new GeminiLive(API_KEY, {
  generationConfig: {
    responseType: "TEXT",
    maxOutputTokens: 500,
  },
});

client.on_handshake(() => {
  console.log("Gemini Live client handshake complete!");

  // Add realtime listener
  client.realtime((response) => {
    console.log("Response >", response.text);
  });

  start_recording();
});

async function start_recording() {
  // Get internal writable stream
  const writable_stream = await client.get_writable_stream();

  console.log("Starting microphone...");
  acord_recorder = spawn("arecord", [
    "-c",
    "1",
    "-r",
    "16000",
    "-f",
    "S16_LE",
    "-t",
    "raw",
    "-D",
    "default",
  ]);

  acord_recorder.stdout!.pipe(writable_stream);

  acord_recorder.stderr!.on("data", (data) => {
    console.error("Recording error:", data.toString());
  });

  acord_recorder.on("error", (error) => {
    console.error("Recording process error:", error);
  });

  console.log("Recording started - speak into your microphone");
}

function cleanup() {
  if (acord_recorder) {
    acord_recorder.kill();
    console.log("\nRecording stopped");
  }
}

client.on_close((reason) => {
  console.log("Transcription stream closed:", reason);
  cleanup();
});

process.on("SIGINT", () => {
  cleanup();
  process.exit();
});
