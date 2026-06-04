// `{{arg}}` interpolation for the http-endpoint tool. The model fills in the
// tool's input args; those values are interpolated into the configured URL,
// query, headers, and body before the request fires. Each context escapes
// differently — naively `replaceAll`-ing a raw value into a JSON body or a
// query string is an injection vector (the README calls this out explicitly),
// so callers pick the mode that matches where the value lands.

export type InterpolationMode =
  | 'raw' // plain text body / form value — value used verbatim
  | 'url' // URL path or query value — percent-encoded
  | 'json' // inside a JSON string literal — JSON-string escaped
  | 'header'; // HTTP header value — CR/LF stripped to block header injection

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

const stringify = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  // Objects/arrays interpolated into a string context — serialize compactly.
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const escapeForMode = (value: string, mode: InterpolationMode): string => {
  switch (mode) {
    case 'url':
      return encodeURIComponent(value);
    case 'header':
      // Strip CR/LF (and the NUL byte) so a value can't inject extra headers.
      return value.replace(/[\r\n\0]/g, '');
    case 'json':
      // JSON.stringify yields a quoted, fully-escaped string literal; drop the
      // surrounding quotes since the template author supplies them around the
      // placeholder (e.g. `{"id":"{{orderId}}"}`).
      return JSON.stringify(value).slice(1, -1);
    case 'raw':
    default:
      return value;
  }
};

/**
 * Replace every `{{key}}` in `template` with the matching value from `args`,
 * escaped for the given context. Unknown placeholders resolve to an empty
 * string so a missing optional arg doesn't leave a literal `{{x}}` behind.
 */
export const interpolate = (
  template: string,
  args: Record<string, unknown>,
  mode: InterpolationMode
): string =>
  template.replace(PLACEHOLDER, (_match, key: string) => {
    const value = Object.prototype.hasOwnProperty.call(args, key)
      ? args[key]
      : '';
    return escapeForMode(stringify(value), mode);
  });
