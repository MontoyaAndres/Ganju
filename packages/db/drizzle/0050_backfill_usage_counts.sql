-- Custom data migration (no schema change): backfill the denormalized usage
-- counters from existing history, so the overview cards aren't stuck at zero on
-- launch for artifacts that were already in use.
--
-- Channel usage comes from channel_message_usage. MCP usage comes from
-- mcp_request on NON-channel sessions only — channel-proxied MCP calls are
-- already represented in channel_message_usage, so excluding them (sessions
-- whose metadata carries a channelId) avoids double counting. This SETs an
-- authoritative snapshot from history; the application then increments forward
-- from here.

WITH channel_counts AS (
  SELECT c.artifact_id AS artifact_id,
         cmu.kind AS kind,
         count(*)::int AS total
  FROM channel_message_usage cmu
  JOIN channel_message cm ON cm.id = cmu.message_id
  JOIN channel_conversation cc ON cc.id = cm.conversation_id
  JOIN channel c ON c.id = cc.channel_id
  GROUP BY c.artifact_id, cmu.kind
),
mcp_counts AS (
  SELECT ms.artifact_id AS artifact_id,
         CASE mr.method
           WHEN 'tools/call' THEN 'tool'
           WHEN 'prompts/get' THEN 'prompt'
           WHEN 'resources/read' THEN 'resource'
         END AS kind,
         count(*)::int AS total
  FROM mcp_request mr
  JOIN mcp_session ms ON ms.id = mr.session_id
  WHERE mr.method IN ('tools/call', 'prompts/get', 'resources/read')
    AND (ms.metadata IS NULL OR ms.metadata->>'channelId' IS NULL)
  GROUP BY ms.artifact_id, mr.method
),
combined AS (
  SELECT artifact_id, kind, total FROM channel_counts
  UNION ALL
  SELECT artifact_id, kind, total FROM mcp_counts
),
totals AS (
  SELECT artifact_id,
         COALESCE(sum(total) FILTER (WHERE kind = 'tool'), 0)::int AS tool,
         COALESCE(sum(total) FILTER (WHERE kind = 'prompt'), 0)::int AS prompt,
         COALESCE(sum(total) FILTER (WHERE kind = 'resource'), 0)::int AS resource
  FROM combined
  GROUP BY artifact_id
)
UPDATE artifact a
SET artifact_tool_usage_count = totals.tool,
    artifact_prompt_usage_count = totals.prompt,
    artifact_resource_usage_count = totals.resource
FROM totals
WHERE totals.artifact_id = a.id;
