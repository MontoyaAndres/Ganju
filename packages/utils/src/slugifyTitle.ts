// Lowercase a human title into a slug usable as a command name / MCP id —
// shared by prompts and resources (anything titled), so it's deliberately
// generic rather than prompt-specific.
export const slugifyTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
