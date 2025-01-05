import { WebSocket } from "ws";
import { Writable } from "stream";
import { pcm_to_wav } from "./audio";
import { validate_non_realtime_input } from "./validate";
import type {
  ChunkProps,
  ConnectionCloseReason,
  GeminiConfig,
  NonRealtimeInput,
  Response,
  SocketResponse,
  ToolCallSocketResponse,
} from "../@types";

/**
 * GeminiLive class for handling real-time communication with the Gemini API
 */
export class GeminiLive {
  // Private instance
  #ws_client?: WebSocket;
  #def_config = {
    model: "models/gemini-2.0-flash-exp",
    generationConfig: {
      candidateCount: 1,
      maxOutputTokens: 2000,
      temperature: 0.7,
      topP: 1,
      topK: 1,
      responseType: "TEXT",
      voiceName: "Puck",
    },
    systemInstruction: "",
    tools: [],
    safetySettings: [],
  };
  #writable_stream?: Writable | undefined;
  #writable_stream_ready: Promise<Writable>;
  #writable_stream_resolve!: (stream: Writable) => void;

  // Basic handlers
  #on_connection_handshake?: () => void;
  #on_connection_opened?: () => void;
  #on_connection_closed?: (reason: ConnectionCloseReason) => void;

  // Main handlers
  #incoming_server_content?: (response: SocketResponse) => void;
  #incoming_tool_call?: (response: ToolCallSocketResponse) => void;

  /**
   * Creates a new GeminiLive instance
   * @param {string} api_token - The API token for authentication
   * @param {GeminiConfig} [generation_config] - Optional configuration for the Gemini model
   * @throws {TypeError} If api_token is not a string
   * @throws {ReferenceError} If api_token is empty
   */
  constructor(api_token: string, generation_config?: GeminiConfig) {
    if (typeof api_token !== "string")
      throw new TypeError(
        `[GeminiRealtime] Expected api_token to be a string, but received ${typeof api_token}.`,
      );
    if (api_token.length === 0)
      throw new ReferenceError("[GeminiRealtime] Api key must be provided.");

    this.#setup_connection(api_token, generation_config);
    this.#writable_stream_ready = new Promise((resolve) => {
      this.#writable_stream_resolve = resolve;
    });
  }

  /**
   * Sets up the WebSocket connection
   * @private
   * @param {string} api_token - The API token for authentication
   * @param {GeminiConfig} [generation_config] - Optional configuration for the Gemini model
   */
  #setup_connection(api_token: string, generation_config?: GeminiConfig) {
    const BASE_URL = "wss://generativelanguage.googleapis.com";
    const API_VERSION = "v1alpha";
    const URL = `${BASE_URL}/ws/google.ai.generativelanguage.${API_VERSION}.GenerativeService.BidiGenerateContent?key=${api_token}`;

    this.#ws_client = new WebSocket(URL);
    this.#ws_client.on("open", () => {
      this.#on_connection_opened?.();
      this.#ws_client?.send(
        JSON.stringify({
          setup: {
            model: this.#def_config.model,
            generationConfig: {
              candidateCount: this.#def_config.generationConfig.candidateCount,
              maxOutputTokens:
                generation_config?.generationConfig?.maxOutputTokens ||
                this.#def_config.generationConfig.maxOutputTokens,
              temperature:
                generation_config?.generationConfig?.temperature ||
                this.#def_config.generationConfig.temperature,
              topP:
                generation_config?.generationConfig?.topP ||
                this.#def_config.generationConfig.topP,
              topK:
                generation_config?.generationConfig?.topK ||
                this.#def_config.generationConfig.topK,
              responseModalities: [
                generation_config?.generationConfig?.responseType ||
                  this.#def_config.generationConfig.responseType,
              ],
              speechConfig: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name:
                      generation_config?.generationConfig?.voiceName ||
                      this.#def_config.generationConfig.voiceName,
                  },
                },
              },
            },
            systemInstruction: {
              parts: {
                text:
                  generation_config?.systemInstruction ||
                  this.#def_config.systemInstruction,
              },
            },
            tools: generation_config?.tools || this.#def_config.tools,
            safetySettings:
              generation_config?.safetySettings ||
              this.#def_config.safetySettings,
          },
        }),
      );
    });
    this.#ws_client.on("close", (code, buf) => {
      const message = buf.toString();
      let closed_props: ConnectionCloseReason;

      if (message.includes("Request trace id:")) {
        const [trace_part, reason] = message.split(", ");
        const trace_id = trace_part.split(": ")[1];
        closed_props = { trace_id, code, reason };
      } else closed_props = { code, reason: message };

      this.#on_connection_closed?.(closed_props);
    });
    this.#ws_client.on("message", (buf) => {
      try {
        const buf_json = JSON.parse(buf.toString());

        if (buf_json.setupComplete) {
          this.#on_connection_handshake?.();
          this.#setup_writable_stream();
          return;
        }

        const server_content = buf_json.serverContent as SocketResponse;
        if (server_content) this.#incoming_server_content?.(server_content);

        const tool_call = buf_json.toolCall as ToolCallSocketResponse;
        if (tool_call) this.#incoming_tool_call?.(tool_call);
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });
  }

  /**
   * Sets up the writable stream for audio data
   * @private
   */
  #setup_writable_stream() {
    const send_chunk = (chunk: Buffer) => {
      if (this.#ws_client?.readyState !== WebSocket.OPEN) return;

      const payload = JSON.stringify({
        realtime_input: {
          media_chunks: [
            {
              data: chunk.toString("base64"),
              mime_type: "audio/pcm",
            },
          ],
        },
      });

      this.#ws_client.send(payload);
    };

    this.#writable_stream = new Writable({
      write: (chunk: Buffer, _, callback) => {
        try {
          send_chunk(chunk);
          callback();
        } catch (error) {
          callback(error as Error);
        }
      },
    });

    this.#writable_stream_resolve(this.#writable_stream);
  }

  /**
   * Creates a response object from received chunks
   * @private
   * @param {ChunkProps} chunks - The received data chunks
   * @returns {Response} The formatted response object
   */
  #create_response(chunks: ChunkProps): Response {
    let wav_data: Buffer | undefined;
    if (chunks.audio.data.length > 0) {
      const pcm_buf = Buffer.from(chunks.audio.data.join(""), "base64");
      wav_data = pcm_to_wav(pcm_buf, 24000, 16);
    }

    if (chunks.functionCall || chunks.executableCode)
      return {
        type: "function",
        role: "gemini",
        functionCall: chunks.functionCall,
        executableCode: chunks.executableCode,
      };

    return {
      type: chunks.audio.mimeType.includes("audio/wav") ? "audio" : "text",
      role: "gemini",
      text: chunks.text.length > 0 ? chunks.text.join("").trim() : undefined,
      audio:
        chunks.audio.data.length > 0
          ? {
              mimeType: "audio/wav",
              data: wav_data?.toString("base64") || "",
            }
          : undefined,
    };
  }

  /**
   * Gets the writable stream for sending audio data
   * @returns {Promise<Writable>} A promise that resolves to a Writable stream
   */
  async get_writable_stream(): Promise<Writable> {
    return this.#writable_stream_ready;
  }

  /**
   * Sends a message to the Gemini API and waits for a response
   * @param {NonRealtimeInput[] | { prompt: string }} input - The input message(s) to send
   * @param {number} [timeout=15000] - Timeout in milliseconds for the request
   * @returns {Promise<Response>} A promise that resolves to the API response
   * @throws {Error} If the input is invalid, connection fails, or request times out
   */
  async send(
    input: NonRealtimeInput[] | { prompt: string },
    timeout: number = 15000,
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const validation = validate_non_realtime_input(input);
      if (!validation.valid)
        reject(new Error(`[GeminiRealtime::send] ${validation.error}`));

      if (typeof timeout !== "number" || timeout <= 0)
        reject(
          new Error(
            `[GeminiRealtime::send] Invalid timeout value: ${timeout}. Timeout must be a positive number (in milliseconds). Received type: ${typeof timeout}.`,
          ),
        );

      if (!this.#ws_client || this.#ws_client.readyState !== WebSocket.OPEN)
        reject(
          new Error(
            "[GeminiRealtime::send] WebSocket connection failed. Please verify your API token and generation config are valid, then reinitialize the client.",
          ),
        );

      const timeout_handler = setTimeout(() => {
        this.#incoming_server_content = undefined;
        reject(
          new Error(
            `[GeminiRealtime::send] Request timed out after ${timeout}ms`,
          ),
        );
      }, timeout);

      const chunks: ChunkProps = {
        text: [],
        audio: {
          mimeType: "",
          data: [],
        },
      };

      this.#incoming_server_content = (response: SocketResponse) => {
        if (response.modelTurn?.parts) {
          let part_idx = 0;
          while (part_idx < response.modelTurn.parts.length) {
            const part = response.modelTurn.parts[part_idx];
            if (part.text) chunks.text.push(part.text);
            else if (part.inlineData) {
              if (!chunks.audio.mimeType)
                chunks.audio.mimeType = part.inlineData.mimeType;
              chunks.audio.data.push(part.inlineData.data);
            } else if (part.executableCode)
              chunks.executableCode = part.executableCode;

            part_idx++;
          }
        }

        if (response.turnComplete) {
          clearTimeout(timeout_handler);
          this.#incoming_server_content = undefined;
          this.#incoming_tool_call = undefined;
          resolve(this.#create_response(chunks));
        }
      };

      this.#incoming_tool_call = (response: ToolCallSocketResponse) => {
        if (response.functionCalls) {
          chunks.functionCall = response.functionCalls[0];

          clearTimeout(timeout_handler);
          this.#incoming_server_content = undefined;
          this.#incoming_tool_call = undefined;
          resolve(this.#create_response(chunks));
        }
      };

      try {
        this.#ws_client?.send(
          JSON.stringify({
            client_content: {
              turns: Array.isArray(input)
                ? input.map((item) => ({
                    parts: [{ text: item.prompt }],
                    role: item.role || "user",
                  }))
                : [
                    {
                      parts: [{ text: input.prompt }],
                      role: "user",
                    },
                  ],
              turn_complete: true,
            },
          }),
        );
      } catch (error) {
        clearTimeout(timeout_handler);
        this.#incoming_server_content = undefined;
        this.#incoming_tool_call = undefined;
        reject(
          new Error(
            `[GeminiRealtime::send] Failed to send message: ${(error as Error).message}`,
          ),
        );
      }
    });
  }

  /**
   * Initiates real-time communication with the Gemini API
   * @param {(response: Response) => void} on_stream_response - Callback function for handling stream responses
   * @param {Buffer} [audio_input] - Optional audio input buffer
   * @throws {Error} If WebSocket connection fails or parameters are invalid
   */
  realtime(
    on_stream_response: (reponse: Response) => void,
    audio_input?: Buffer,
  ) {
    if (!this.#ws_client || this.#ws_client.readyState !== WebSocket.OPEN)
      throw new Error(
        "[GeminiRealtime::realtime] WebSocket connection failed. Please verify your API token and generation config are valid, then reinitialize the client.",
      );

    if (typeof on_stream_response !== "function")
      throw new TypeError(
        `[GeminiRealtime::realtime] Expected on_stream_response to be a function, but received ${typeof on_stream_response}.`,
      );

    if (audio_input && !Buffer.isBuffer(audio_input))
      throw new TypeError(
        `[GeminiRealtime::realtime] Expected audio_input to be a Buffer, but received ${typeof audio_input}.`,
      );

    const chunks: ChunkProps = {
      text: [],
      audio: {
        mimeType: "",
        data: [],
      },
    };

    this.#incoming_server_content = (response: SocketResponse) => {
      if (response.modelTurn?.parts) {
        let part_idx = 0;
        while (part_idx < response.modelTurn.parts.length) {
          const part = response.modelTurn.parts[part_idx];
          if (part.text) chunks.text.push(part.text);
          else if (part.inlineData) {
            if (!chunks.audio.mimeType)
              chunks.audio.mimeType = part.inlineData.mimeType;
            chunks.audio.data.push(part.inlineData.data);
          } else if (part.executableCode)
            chunks.executableCode = part.executableCode;

          part_idx++;
        }
      }

      if (response.turnComplete) {
        on_stream_response?.(this.#create_response(chunks));

        chunks.text = [];
        chunks.audio.data = [];
        chunks.audio.mimeType = "";
        chunks.functionCall = undefined;
        chunks.executableCode = undefined;
      }
    };

    this.#incoming_tool_call = (response: ToolCallSocketResponse) => {
      if (response.functionCalls) {
        chunks.functionCall = response.functionCalls[0];
        on_stream_response?.(this.#create_response(chunks));
      }
    };

    if (!audio_input) return;
    try {
      this.#ws_client?.send(
        JSON.stringify({
          realtime_input: {
            media_chunks: [
              {
                data: audio_input.toString("base64"),
                mime_type: "audio/pcm",
              },
            ],
          },
        }),
      );
    } catch (error) {
      this.#incoming_server_content = undefined;
      this.#incoming_tool_call = undefined;
      chunks.text = [];
      chunks.audio.data = [];
      chunks.audio.mimeType = "";
      chunks.functionCall = undefined;
      chunks.executableCode = undefined;
      throw new Error(
        `[GeminiRealtime::send] Failed to send message: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Sets up a callback for when the connection handshake is complete
   * @param {() => void} callbackfn - The callback function to execute
   * @returns {this} The current instance for method chaining
   */
  on_handshake(callbackfn: () => void): this {
    this.#on_connection_handshake = callbackfn;
    return this;
  }

  /**
   * Sets up a callback for when the connection is opened
   * @param {() => void} callbackfn - The callback function to execute
   * @returns {this} The current instance for method chaining
   */
  on_open(callbackfn: () => void): this {
    this.#on_connection_opened = callbackfn;
    return this;
  }

  /**
   * Sets up a callback for when the connection is closed
   * @param {(reason: ConnectionCloseReason) => void} callbackfn - The callback function to execute
   * @returns {this} The current instance for method chaining
   */
  on_close(callbackfn: (reason: ConnectionCloseReason) => void): this {
    this.#on_connection_closed = callbackfn;
    return this;
  }
}
