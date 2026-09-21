type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Prevent literal </script> text from terminating a JSON-LD script element.
export function serializeJsonLd(value: JsonValue): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
