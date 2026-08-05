/**
 * Safely extract a string param from Express req.params
 * (Express types it as string | string[] but at runtime it's always string)
 */
export const param = (value: string | string[]): string =>
  Array.isArray(value) ? value[0] : value;
