import { strFromU8, strToU8 } from "fflate";

/** fflate works in the native runtime as well as Node, without TextDecoder polyfills. */
export function decodeUtf8(bytes: Uint8Array): string | undefined {
  let text: string;
  try {
    text = strFromU8(bytes);
  } catch {
    return undefined;
  }
  const encoded = strToU8(text);
  if (encoded.length !== bytes.length || encoded.some((byte, index) => byte !== bytes[index])) {
    return undefined;
  }
  return text;
}
