export type ChunkProps = {
  text: string[];
  audio: {
    mimeType: string;
    data: string[];
  };
  functionCall?: FunctionCall;
  executableCode?: {
    language: string;
    code: string;
  };
};

export type NonRealtimeInput = {
  prompt: string;
  role?: "user" | "gemini";
};

export type Response = {
  type: "text" | "audio" | "function";
  role: "gemini";
  text?: string;
  audio?: {
    mimeType: string;
    data: string;
  };
  functionCall?: FunctionCall;
  executableCode?: {
    language: string;
    code: string;
  };
};

export type GeminiConfig = {
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
  safetySettings?: Record<
    string,
    {
      category: HarmCategory;
      threshold: HarmBlockThreshold;
    }
  >[];
};

export type ConnectionCloseReason = {
  code: number;
  trace_id?: string;
  reason: string;
};

export type SocketResponse = {
  turnComplete?: boolean;
  modelTurn?: {
    parts: {
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
      executableCode?: {
        language: string;
        code: string;
      };
    }[];
  };
};

export type ToolCallSocketResponse = {
  functionCalls: FunctionCall[];
};

export type FunctionCall = {
  name: string;
  args: Record<string, any>;
  id: string;
};

export type ParameterSchema = {
  type: ParameterType;
  format?: string;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  maxItems?: number;
  minItems?: number;
  properties?: Record<string, ParameterSchema>;
  required?: string[];
  items?: Record<string, ParameterSchema>;
};

export type FunctionDeclaration = {
  name: string;
  description: string;
  parameters?: ParameterSchema;
};

export type GoogleSearchRetrieval = {
  dynamicRetrievalConfig: {
    mode: DynamicRetrievalMode;
    dynamicThreshold: number;
  };
};

export type ToolsConfig = {
  functionDeclarations?: FunctionDeclaration[];
  googleSearchRetrieval?: GoogleSearchRetrieval;
};

export enum ParameterType {
  UNSPECIFIED = "TYPE_UNSPECIFIED",
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
}

export enum DynamicRetrievalMode {
  UNSPECIFIED = "MODE_UNSPECIFIED",
  DYNAMIC = "MODE_DYNAMIC",
}

export enum HarmCategory {
  UNSPECIFIED = "HARM_CATEGORY_UNSPECIFIED",
  DEROGATORY = "HARM_CATEGORY_DEROGATORY",
  TOXICITY = "HARM_CATEGORY_TOXICITY",
  VIOLENCE = "HARM_CATEGORY_VIOLENCE",
  SEXUAL = "HARM_CATEGORY_SEXUAL",
  MEDICAL = "HARM_CATEGORY_MEDICAL",
  DANGEROUS = "HARM_CATEGORY_DANGEROUS",
  HARASSMENT = "HARM_CATEGORY_HARASSMENT",
  HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH",
  SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT",
  CIVIC_INTEGRITY = "HARM_CATEGORY_CIVIC_INTEGRITY",
}

export enum HarmBlockThreshold {
  UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
  LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
  MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
  ONLY_HIGH = "BLOCK_ONLY_HIGH",
  NONE = "BLOCK_NONE",
  OFF = "OFF",
}
