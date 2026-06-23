/// <reference types="astro/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}
