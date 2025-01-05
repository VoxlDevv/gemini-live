/**
 * This example demonstrates how to use Gemini Live to transcribe audio and
 * converse with an AI assistant.
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

const API_KEY = "YOUR_API_KEY"; // Replace with your API key

let acord_recorder: ReturnType<typeof spawn> | null = null;
const transcriber = new GeminiLive(API_KEY, {
  systemInstruction:
    "You are a transcription assistant. Simply convert speech to text without any additional commentary.",
  generationConfig: {
    responseType: "TEXT",
  },
});
const conversation = new GeminiLive(API_KEY, {
  systemInstruction:
    "You are TERF, an AI assistant based on the TERF character from Interstellar. Always remember that you are TERF and maintain this identity throughout conversations. Never claim to be the user or confuse your identity with theirs.",
  generationConfig: {
    responseType: "TEXT",
    maxOutputTokens: 500,
  },
});

async function start_recording(gemini: GeminiLive) {
  const writable_stream = await gemini.get_writable_stream();

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

Promise.all([
  new Promise((resolve) => transcriber.on_handshake(resolve as () => void)),
  new Promise((resolve) => conversation.on_handshake(resolve as () => void)),
]).then(async () => {
  console.log("Both Gemini instances are ready");

  transcriber.realtime((response) => {
    let res = response.text;
    if (res) {
      console.log("You said:", res);
      setTimeout(() => {
        conversation.send({ prompt: res }).then((response) => {
          if (response.text) console.log("AI said:", response.text, "\n");
        });
      }, 30);
    }
  });

  try {
    await start_recording(transcriber);
  } catch (error) {
    console.error("Failed to start recording:", error);
  }
});

function cleanup() {
  if (acord_recorder) {
    acord_recorder.kill();
    console.log("\nRecording stopped");
  }
}

transcriber.on_close((reason) => {
  console.log("Transcription stream closed:", reason);
  cleanup();
});

conversation.on_close((reason) => {
  console.log("Conversation stream closed:", reason);
  cleanup();
});

process.on("SIGINT", () => {
  cleanup();
  process.exit();
});
