type ValidationResult = { valid: boolean; error?: string };

export const validate_non_realtime_input = (input: any): ValidationResult => {
  if (!input)
    return {
      valid: false,
      error: "Input cannot be null or undefined",
    };

  if (Array.isArray(input)) {
    const is_valid = input.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "prompt" in item &&
        typeof item.prompt === "string" &&
        (!item.role || ["user", "gemini"].includes(item.role)),
    );

    if (!is_valid)
      return {
        valid: false,
        error:
          "Array input must contain objects with 'prompt' string and optional valid role",
      };

    return { valid: true };
  }

  if (typeof input !== "object" || input === null)
    return {
      valid: false,
      error: "Single input must be an object",
    };

  if (!("prompt" in input) || typeof input.prompt !== "string")
    return {
      valid: false,
      error: "Single input must contain a 'prompt' string property",
    };

  return { valid: true };
};
