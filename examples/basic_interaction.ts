/**
 * * This example demonstrates how to use Gemini Live to send a message and
 * receive a response.
 *
 * To run this example, you will need to have a Gemini Live account and obtain
 * an API key. You can sign up for a free account at https://aistudio.google.com/.
 *
 * Once you have your API key, replace "YOUR_API_KEY" with your actual API key
 */

import { GeminiLive } from "../src";

const api_token = "YOUR_API_KEY"; // Replace with your API key
const client = new GeminiLive(api_token, {
  generationConfig: {
    responseType: "TEXT", // You can also use "AUDIO" for audio responses, its ready to be used, just need to be converted to base64
    maxOutputTokens: 500,
  },
});

client.on_open(() => {
  console.log("Gemini Live client connected!");
});

client.on_close((reason) => {
  console.log("Gemini Live client disconnected:", reason);
});

client.on_handshake(() => {
  console.log("Gemini Live client handshake complete!");

  // Must be called after on_handshake, same as realtime
  client
    .send({
      prompt: "Hello gemini",
    })
    .then((response) => {
      console.log("Response", response);
    });
});
