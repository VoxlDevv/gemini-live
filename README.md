# Gemini Live WebSocket Client

A TypeScript client for real-time communication with Google's Gemini API via WebSocket, supporting text, audio, function calls, and executable code responses.

## Features

| Feature              | Support | Description                                |
| -------------------- | ------- | ------------------------------------------ |
| Text to Text         | ✅      | Standard text conversation                 |
| Text to Audio        | ✅      | Convert text input to audio response       |
| Audio to Text        | ✅      | Convert audio input to text response       |
| Audio to Audio       | ✅      | Process audio input and respond with audio |
| Function Calls       | ✅      | Handle function calling capabilities       |
| Executable Code      | ✅      | Receive executable code responses          |
| Real-time Streaming  | ✅      | Stream responses in real-time              |
| Custom Configuration | ✅      | Configurable model parameters              |
| Safety Settings      | ✅      | Customizable content safety filters        |
| Connection Events    | ✅      | Handlers for connection lifecycle          |

## Limitations

| Feature                 | Status | Description                              |
| ----------------------- | ------ | ---------------------------------------- |
| Code Execution          | ❌     | tools.codeExecution not implemented yet  |
| Multi-part Response     | ❌     | Only supports text and inlineData parts  |
| Multiple Function Calls | ❌     | Limited to single function call output   |
| Multiple Code Blocks    | ❌     | Limited to single executable code output |

## Installation

```bash
npm install gemini-live
```

## Basic Usage

```typescript
import { GeminiLive } from "gemini-live";

// Initialize client
const client = new GeminiLive("YOUR_API_KEY", {
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2000,
  },
});

// Basic text conversation
async function chat() {
  const response = await client.send({ prompt: "Hello, how are you?" });
  console.log(response.text);
}

// Real-time audio streaming
client.realtime((response) => {
  if (response.type === "audio") {
    // Handle audio response
    console.log(response.audio.data);
  } else if (response.type === "text") {
    // Handle text response
    console.log(response.text);
  }
});
```

Note: send and realtime wont work if the client is not connected or handshaked.

## Advanced Features

### Function Calling

```typescript
const client = new GeminiLive("YOUR_API_KEY", {
  tools: {
    functionDeclarations: [
      {
        name: "get_weather",
        description: "Get current weather",
        parameters: {
          type: ParameterType.OBJECT,
          properties: {
            location: {
              type: ParameterType.STRING,
              description: "City name",
            },
          },
        },
      },
    ],
  },
});

// Handle function calls
client.send({ prompt: "What's the weather in Tokyo?" }).then((response) => {
  if (response.type === "function" && response.functionCall) {
    console.log(response.functionCall);
  }
});
```

### Event Handling

```typescript
client
  .on_open(() => console.log("Connected!"))
  .on_handshake(() => console.log("Handshake complete"))
  .on_close((reason) => console.log("Closed:", reason));
```

## Configuration Options

```typescript
type GeminiConfig = {
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    responseType?: "TEXT" | "AUDIO";
    voiceName?: "Aoede" | "Charon" | "Fenrir" | "Kore" | "Puck";
  };
  systemInstruction?: string;
  tools?: ToolsConfig;
  safetySettings?: SafetySettings[];
};
```

## Examples

For more examples, see the [examples directory](examples).

## License

[MIT](LICENSE)

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.
