// Wire protocol shared between the worker (which constructs the request) and
// the resource-handler container (which parses it and calls the Telegram Bot
// API). Worker sends a multipart/form-data POST with one `metadata` field
// (JSON matching TelegramSendRequest) and exactly one `file` field (binary).
//
// Telegram supports one media object per send call, so unlike Gmail this is
// always a single attachment.

export interface TelegramSendRequest {
  botToken: string;
  chatId: number;
  replyToMessageId?: number;
  caption?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export interface TelegramSendResponse {
  ok: boolean;
  result?: { message_id: number };
  description?: string;
}

// Wire protocol for sending a PROXIED (remote MCP) resource as a file. Unlike
// TelegramSendRequest (where the worker has already read the bytes and posts
// them as multipart), here the worker sends only the connection details as
// JSON and the resource-handler container does the remote read + decode + send
// itself — so a large file's bytes never transit the 128 MiB worker. The worker
// resolves the (small) auth header; the file itself stays in the container.
export interface TelegramSendRemoteResourceRequest {
  telegram: TelegramSendRequest;
  remote: {
    url: string;
    transport: string;
    // Single header injected on the remote MCP connection (e.g. Authorization).
    authHeader?: { name: string; value: string } | null;
    uri: string;
    timeoutMs: number;
  };
}
