import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '@emotion/react';
import type { Theme } from '@emotion/react';
import { UI } from '@ganju/ui';
import { utils } from '@ganju/utils';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import {
  ContentCopy,
  EditOutlined,
  ChevronRight,
  ShowChartOutlined,
  StackedLineChartOutlined,
  BarChartOutlined,
  FolderOutlined,
  ExtensionOutlined,
  ChatOutlined,
  ScheduleOutlined
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Tooltip as ChartTooltip,
  Filler
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Chart } from 'react-chartjs-2';

import { Wrapper, McpModalBody } from './styles';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  ChartTooltip,
  Filler
);

type IconComponent = (typeof UI.Icons)['Slack'];
type ChartColors = Theme['chart'];

interface ChannelRow {
  id: string;
  platform: string;
  status: string;
}

interface ChannelPoint {
  platform: string;
  date: string;
  total: number;
}

interface McpPoint {
  client: string | null;
  date: string;
  total: number;
}

interface RecentExecution {
  id: string;
  kind: string;
  name: string | null;
  source: string;
  userName: string | null;
  externalActorName: string | null;
  createdAt: string;
}

interface Overview {
  project: { id: string; name: string; description: string | null };
  artifact: { id: string; slug: string };
  stats: {
    resources: { count: number; totalSize: number; usage: number };
    tools: { count: number; usage: number };
    prompts: { count: number; usage: number };
    channels: { count: number };
  };
  channels: ChannelRow[];
  activity: {
    since: string;
    days: number;
    channel: ChannelPoint[];
    mcp: McpPoint[];
  };
  recentActivity: RecentExecution[];
}

type Status = 'idle' | 'pending' | 'resolved' | 'rejected';
type ChartType = 'line' | 'area' | 'bar';
type RangeDays = 7 | 30 | 90;

// Channel label + brand icon are static; colors come from theme.chart.
const PLATFORM_INFO: Record<string, { label: string; Icon: IconComponent }> = {
  telegram: { label: 'Telegram', Icon: UI.Icons.Telegram },
  whatsapp: { label: 'WhatsApp', Icon: UI.Icons.WhatsApp },
  slack: { label: 'Slack', Icon: UI.Icons.Slack },
  discord: { label: 'Discord', Icon: UI.Icons.Discord }
};

const channelColor = (platform: string, chart: ChartColors): string => {
  switch (platform) {
    case 'telegram':
      return chart.telegram;
    case 'whatsapp':
      return chart.whatsapp;
    case 'slack':
      return chart.slack;
    case 'discord':
      return chart.discord;
    default:
      return chart.fallback;
  }
};

const RANGE_OPTIONS: RangeDays[] = [7, 30, 90];
const CHART_OPTIONS: { type: ChartType; label: string; Icon: IconComponent }[] =
  [
    { type: 'line', label: 'Line', Icon: ShowChartOutlined },
    { type: 'area', label: 'Area', Icon: StackedLineChartOutlined },
    { type: 'bar', label: 'Bar', Icon: BarChartOutlined }
  ];

const hexAlpha = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, exp);
  return `${value >= 10 || exp === 0 ? Math.round(value) : value.toFixed(1)} ${units[exp]}`;
};

const formatNumber = (n: number): string => n.toLocaleString('en-US');

const KIND_VERB: Record<string, string> = {
  tool: 'ran',
  prompt: 'used',
  resource: 'read'
};

const sourceLabel = (source: string): string =>
  source === 'mcp'
    ? 'MCP'
    : PLATFORM_INFO[source]?.label ||
      source.charAt(0).toUpperCase() + source.slice(1);

const sourceColor = (source: string, chart: ChartColors): string =>
  source === 'mcp' ? chart.mcp : channelColor(source, chart);

const sourceIcon = (source: string): IconComponent | null =>
  PLATFORM_INFO[source]?.Icon || null;

const actorName = (e: RecentExecution): string =>
  e.userName ||
  e.externalActorName ||
  (e.source === 'mcp' ? 'An MCP client' : 'Someone');

// Build the trailing N-day axis from the server-provided window start. The
// server buckets via date_trunc/to_char, so we mirror those YYYY-MM-DD keys
// here (UTC) to align points to columns without a timezone drift.
const buildAxis = (sinceIso: string, days: number): string[] => {
  const start = sinceIso.slice(0, 10);
  const [y, m, d] = start.split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d);
  const axis: string[] = [];
  for (let i = 0; i < days; i++) {
    axis.push(new Date(startMs + i * 86400000).toISOString().slice(0, 10));
  }
  return axis;
};

const shortDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

interface Series {
  key: string;
  label: string;
  color: string;
  Icon: IconComponent | null;
  points: number[];
  total: number;
}

const buildSeries = (
  activity: Overview['activity'],
  axis: string[],
  chart: ChartColors
): Series[] => {
  const idx = new Map(axis.map((d, i) => [d, i]));
  const series: Series[] = [];

  // One line per channel platform.
  const byPlatform = new Map<string, number[]>();
  for (const row of activity.channel) {
    const platform = row.platform || 'unknown';
    if (!byPlatform.has(platform)) {
      byPlatform.set(platform, new Array(axis.length).fill(0));
    }
    const i = idx.get(row.date);
    if (i !== undefined) byPlatform.get(platform)![i] = row.total;
  }
  for (const [platform, points] of byPlatform) {
    series.push({
      key: `ch:${platform}`,
      label: PLATFORM_INFO[platform]?.label || platform,
      color: channelColor(platform, chart),
      Icon: PLATFORM_INFO[platform]?.Icon || null,
      points,
      total: points.reduce((a, b) => a + b, 0)
    });
  }

  // One line per MCP client, so you can see which client was used.
  const byClient = new Map<string, number[]>();
  for (const row of activity.mcp) {
    const client = row.client || 'Unknown client';
    if (!byClient.has(client)) {
      byClient.set(client, new Array(axis.length).fill(0));
    }
    const i = idx.get(row.date);
    if (i !== undefined) byClient.get(client)![i] = row.total;
  }
  Array.from(byClient.entries())
    .map(([client, points]) => ({
      client,
      points,
      total: points.reduce((a, b) => a + b, 0)
    }))
    .sort((a, b) => b.total - a.total)
    .forEach((c, i) => {
      series.push({
        key: `mcp:${c.client}`,
        label: c.client,
        color: chart.mcpPalette[i % chart.mcpPalette.length],
        Icon: null,
        points: c.points,
        total: c.total
      });
    });

  return series;
};

const ActivityChart = ({
  axis,
  series,
  chartType,
  hidden
}: {
  axis: string[];
  series: Series[];
  chartType: ChartType;
  hidden: Set<string>;
}) => {
  const theme = useTheme();
  const axisColor = theme.colors.saltBox;
  const gridColor = hexAlpha(theme.colors.bastille, 0.07);
  const isBar = chartType === 'bar';

  const data = useMemo<ChartData<'line' | 'bar', number[], string>>(
    () => ({
      labels: axis.map(shortDate),
      datasets: series.map(s => ({
        label: s.label,
        data: s.points,
        borderColor: s.color,
        backgroundColor: isBar ? s.color : hexAlpha(s.color, 0.16),
        fill: chartType === 'area',
        hidden: hidden.has(s.key),
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: s.color,
        borderRadius: 3,
        maxBarThickness: 22
      }))
    }),
    [axis, series, chartType, hidden, isBar]
  );

  const options = useMemo<ChartOptions<'line' | 'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.colors.bastille,
          padding: 10,
          cornerRadius: 8,
          usePointStyle: true,
          boxPadding: 4,
          titleFont: { family: theme.typography.fontFamily, weight: 700 },
          bodyFont: { family: theme.typography.fontFamily }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: axisColor,
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 0,
            font: { size: 10, family: theme.typography.fontFamily }
          }
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          ticks: {
            color: axisColor,
            precision: 0,
            font: { size: 10, family: theme.typography.fontFamily }
          },
          grid: { color: gridColor }
        }
      }
    }),
    [theme, axisColor, gridColor]
  );

  return (
    <div className="overview-chart">
      <Chart type={isBar ? 'bar' : 'line'} data={data} options={options} />
    </div>
  );
};

export const Overview = () => {
  const router = useRouter();
  const theme = useTheme();
  const chart = theme.chart;
  const snackbar = UI.Alert.useSnackbar();
  const { id: organizationId, projectId } = router.query as {
    id: string;
    projectId: string;
  };

  const [data, setData] = useState<Overview | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const [days, setDays] = useState<RangeDays>(7);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState(false);
  const slugInputRef = useRef<HTMLInputElement>(null);

  const apiBase = `/organization/${organizationId}/project/${projectId}`;

  const mcpRoot = (process.env.NEXT_PUBLIC_MCP_URL || '').replace(/\/+$/, '');
  const mcpUrl = data ? `${mcpRoot}/${data.artifact.slug}` : '';
  const previewSlug = slugValue.trim().toLowerCase();

  const fetchOverview = async (range: RangeDays, signal?: AbortSignal) => {
    if (!organizationId || !projectId) return;
    setStatus('pending');
    try {
      const result = await utils.fetcher({
        url: `${apiBase}/overview?days=${range}`,
        config: { credentials: 'include', signal }
      });
      if (signal?.aborted) return;
      if (result && !result.error) {
        setData(result);
        setStatus('resolved');
      } else {
        throw new Error('rejected');
      }
    } catch {
      if (signal?.aborted) return;
      // Keep the page usable if a range change fails after the first load.
      if (data) snackbar.error('Could not refresh activity');
      setStatus('rejected');
    }
  };

  useEffect(() => {
    if (!organizationId || !projectId) return;
    const controller = new AbortController();
    fetchOverview(days, controller.signal);
    return () => controller.abort();
  }, [organizationId, projectId, days]);

  useEffect(() => {
    if (editingSlug) {
      slugInputRef.current?.focus();
      slugInputRef.current?.select();
    }
  }, [editingSlug]);

  const axis = useMemo(
    () => (data ? buildAxis(data.activity.since, data.activity.days) : []),
    [data]
  );
  const allSeries = useMemo(
    () => (data ? buildSeries(data.activity, axis, chart) : []),
    [data, axis, chart]
  );
  const visibleCount = allSeries.filter(s => !hidden.has(s.key)).length;
  const hasActivity = allSeries.some(s => s.total > 0);

  const toggleSeries = (key: string) =>
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const startEditSlug = () => {
    if (!data) return;
    setSlugValue(data.artifact.slug);
    setSlugError(null);
    setEditingSlug(true);
  };

  const cancelEditSlug = () => {
    setEditingSlug(false);
    setSlugError(null);
  };

  const handleCopy = () => {
    if (!mcpUrl) return;
    navigator.clipboard
      .writeText(mcpUrl)
      .then(() => snackbar.success('MCP URL copied'))
      .catch(() => snackbar.error('Could not copy'));
  };

  const handleSaveSlug = async () => {
    if (!data || savingSlug) return;
    const next = previewSlug;
    if (next === data.artifact.slug) {
      cancelEditSlug();
      return;
    }
    if (!utils.isValidSlugFormat(next)) {
      setSlugError(
        'Use 3-63 lowercase letters, digits or hyphens, starting and ending with a letter or digit.'
      );
      return;
    }
    if (utils.isReservedSlug(next)) {
      setSlugError('That slug is reserved.');
      return;
    }
    setSavingSlug(true);
    setSlugError(null);
    try {
      const result = await utils.fetcher({
        url: `${apiBase}/artifact/slug`,
        config: {
          method: 'PUT',
          credentials: 'include',
          body: JSON.stringify({ slug: next })
        }
      });
      if (result && !result.error && result.slug) {
        setData(prev =>
          prev
            ? { ...prev, artifact: { ...prev.artifact, slug: result.slug } }
            : prev
        );
        setEditingSlug(false);
        snackbar.success('MCP URL updated');
      } else {
        setSlugError(result?.error || 'Could not update the slug.');
      }
    } catch {
      setSlugError('Could not update the slug.');
    } finally {
      setSavingSlug(false);
    }
  };

  const goTo = (section: string) => router.push(`${apiBase}/${section}`);

  // Only block the whole page on the very first load failing.
  if (status === 'rejected' && !data) {
    return (
      <Wrapper>
        <div className="overview-inner">
          <div className="overview-error">
            <ShowChartOutlined />
            <p>We couldn&apos;t load this project&apos;s overview.</p>
            <UI.Button size="small" onClick={() => fetchOverview(days)}>
              <span className="button-text">Retry</span>
            </UI.Button>
          </div>
        </div>
      </Wrapper>
    );
  }

  const loading = !data;

  // Live preview of the MCP connection as the user edits the slug — the
  // resulting URL plus how it drops into an MCP client's config.
  const previewUrl = `${mcpRoot}/${previewSlug || data?.artifact.slug || ''}`;
  const configName = previewSlug || data?.artifact.slug || 'ganju';
  const configSnippet = JSON.stringify(
    { mcpServers: { [configName]: { url: previewUrl } } },
    null,
    2
  );

  return (
    <Wrapper>
      <div className="overview-inner">
        <div className="overview-header">
          <div className="overview-heading">
            {loading ? (
              <>
                <UI.Skeleton variant="text" width={220} height={28} />
                <UI.Skeleton variant="text" width={320} height={14} />
              </>
            ) : (
              <>
                <h1 className="overview-title">{data.project.name}</h1>
                <p className="overview-subtitle">
                  {data.project.description ||
                    'Everything this project exposes through its MCP server, at a glance.'}
                </p>
              </>
            )}
          </div>
          <div className="overview-mcp">
            <p className="overview-mcp-label">MCP URL</p>
            {loading ? (
              <UI.Skeleton variant="rounded" width="100%" height={44} />
            ) : (
              <div className="overview-mcp-row">
                <Tooltip title="Click to copy">
                  <button
                    type="button"
                    className="overview-mcp-url"
                    onClick={handleCopy}
                  >
                    <span className="overview-mcp-url-text">{mcpUrl}</span>
                    <ContentCopy className="overview-mcp-url-copy" />
                  </button>
                </Tooltip>
                <Tooltip title="Edit MCP URL">
                  <IconButton size="small" onClick={startEditSlug}>
                    <EditOutlined />
                  </IconButton>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
        <div className="overview-card overview-activity">
          <div className="overview-activity-head">
            <div className="overview-activity-headings">
              <p className="overview-activity-title">Activity</p>
              <p className="overview-activity-sub">
                Interactions per day across channels and MCP clients
              </p>
            </div>
            <div className="overview-activity-controls">
              <div className="overview-seg">
                {RANGE_OPTIONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`overview-seg-btn ${days === r ? 'active' : ''}`}
                    onClick={() => setDays(r)}
                  >
                    {r}d
                  </button>
                ))}
              </div>
              <div className="overview-seg">
                {CHART_OPTIONS.map(opt => (
                  <Tooltip key={opt.type} title={opt.label}>
                    <button
                      type="button"
                      className={`overview-seg-btn icon ${chartType === opt.type ? 'active' : ''}`}
                      onClick={() => setChartType(opt.type)}
                    >
                      <opt.Icon />
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
          {loading ? (
            <UI.Skeleton variant="rounded" width="100%" height={240} />
          ) : !hasActivity ? (
            <div className="overview-activity-empty">
              <ShowChartOutlined />
              <p>No activity yet in the last {data.activity.days} days.</p>
            </div>
          ) : (
            <>
              <div className="overview-legend">
                {allSeries.map(s => {
                  const isHidden = hidden.has(s.key);
                  return (
                    <button
                      type="button"
                      key={s.key}
                      className={`overview-legend-item ${isHidden ? 'is-hidden' : ''}`}
                      onClick={() => toggleSeries(s.key)}
                      title={isHidden ? 'Show' : 'Hide'}
                    >
                      {s.Icon ? (
                        <s.Icon
                          className="overview-legend-icon"
                          style={{ color: s.color }}
                        />
                      ) : (
                        <span
                          className="overview-legend-dot"
                          style={{ background: s.color }}
                        />
                      )}
                      {s.label} <strong>{formatNumber(s.total)}</strong>
                    </button>
                  );
                })}
              </div>
              {visibleCount === 0 ? (
                <div className="overview-activity-empty">
                  <ShowChartOutlined />
                  <p>
                    Every series is hidden — click a legend item to show it.
                  </p>
                </div>
              ) : (
                <ActivityChart
                  axis={axis}
                  series={allSeries}
                  chartType={chartType}
                  hidden={hidden}
                />
              )}
            </>
          )}
        </div>
        <div className="overview-stats">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overview-card overview-stat">
                <UI.Skeleton variant="rounded" width={38} height={38} />
                <UI.Skeleton variant="text" width={60} height={34} />
                <UI.Skeleton variant="text" width={120} height={14} />
              </div>
            ))
          ) : (
            <>
              <button
                type="button"
                className="overview-card overview-stat"
                onClick={() => goTo('resources')}
              >
                <div className="overview-stat-top">
                  <span className="overview-stat-icon">
                    <FolderOutlined />
                  </span>
                  <span className="overview-stat-arrow">
                    <ChevronRight />
                  </span>
                </div>
                <p className="overview-stat-count">
                  {formatNumber(data.stats.resources.count)}
                </p>
                <p className="overview-stat-label">Resources</p>
                <p className="overview-stat-meta">
                  {formatBytes(data.stats.resources.totalSize)} stored ·{' '}
                  {formatNumber(data.stats.resources.usage)} reads
                </p>
              </button>

              <button
                type="button"
                className="overview-card overview-stat"
                onClick={() => goTo('tools')}
              >
                <div className="overview-stat-top">
                  <span className="overview-stat-icon">
                    <ExtensionOutlined />
                  </span>
                  <span className="overview-stat-arrow">
                    <ChevronRight />
                  </span>
                </div>
                <p className="overview-stat-count">
                  {formatNumber(data.stats.tools.count)}
                </p>
                <p className="overview-stat-label">Tools</p>
                <p className="overview-stat-meta">
                  {formatNumber(data.stats.tools.usage)} calls
                </p>
              </button>

              <button
                type="button"
                className="overview-card overview-stat"
                onClick={() => goTo('prompts')}
              >
                <div className="overview-stat-top">
                  <span className="overview-stat-icon">
                    <ChatOutlined />
                  </span>
                  <span className="overview-stat-arrow">
                    <ChevronRight />
                  </span>
                </div>
                <p className="overview-stat-count">
                  {formatNumber(data.stats.prompts.count)}
                </p>
                <p className="overview-stat-label">Prompts</p>
                <p className="overview-stat-meta">
                  {formatNumber(data.stats.prompts.usage)} uses
                </p>
              </button>
            </>
          )}
        </div>
        <div className="overview-card overview-recent">
          <p className="overview-recent-title">Recent activity</p>
          {loading ? (
            <div className="overview-recent-list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="overview-recent-item">
                  <UI.Skeleton variant="circular" width={28} height={28} />
                  <UI.Skeleton variant="text" width="60%" height={14} />
                </div>
              ))}
            </div>
          ) : data.recentActivity.length === 0 ? (
            <div className="overview-recent-empty">
              <ScheduleOutlined />
              <p>No tool, prompt, or resource runs recorded yet.</p>
            </div>
          ) : (
            <div className="overview-recent-list">
              {data.recentActivity.map(e => {
                const Icon = sourceIcon(e.source);
                return (
                  <div key={e.id} className="overview-recent-item">
                    <span
                      className="overview-recent-source"
                      style={{ background: sourceColor(e.source, chart) }}
                      title={sourceLabel(e.source)}
                    >
                      {Icon ? <Icon /> : sourceLabel(e.source).charAt(0)}
                    </span>
                    <p className="overview-recent-text">
                      <strong>{actorName(e)}</strong>{' '}
                      {KIND_VERB[e.kind] || 'used'}{' '}
                      <span className="overview-recent-name">
                        {e.name || e.kind}
                      </span>
                      <span className="overview-recent-via">
                        {' '}
                        · {sourceLabel(e.source)}
                      </span>
                    </p>
                    <span className="overview-recent-time">
                      {utils.formatRelativeTime(e.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <UI.Modal
          open={editingSlug}
          title="Edit MCP URL"
          width={560}
          onClose={() => {
            if (!savingSlug) cancelEditSlug();
          }}
          footer={
            <>
              <UI.Button
                size="small"
                className="small"
                disabled={savingSlug}
                onClick={cancelEditSlug}
              >
                Cancel
              </UI.Button>
              <UI.Button
                variant="contained"
                size="small"
                className="small"
                disabled={savingSlug}
                onClick={handleSaveSlug}
              >
                <span className="button-text">
                  {savingSlug ? 'Saving…' : 'Save'}
                </span>
              </UI.Button>
            </>
          }
        >
          <McpModalBody>
            <div>
              <label className="mcp-modal-field-label">Slug</label>
              <div className={`mcp-modal-field ${slugError ? 'is-error' : ''}`}>
                <span className="mcp-modal-prefix">{mcpRoot}/</span>
                <input
                  ref={slugInputRef}
                  value={slugValue}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="my-company"
                  disabled={savingSlug}
                  onChange={e => {
                    setSlugValue(e.target.value);
                    if (slugError) setSlugError(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveSlug();
                    if (e.key === 'Escape') cancelEditSlug();
                  }}
                />
              </div>
              {slugError && <p className="mcp-modal-error">{slugError}</p>}
            </div>
            <div className="mcp-modal-section">
              <p className="mcp-modal-section-label">Preview</p>
              <UI.CopyableBlock
                label="MCP URL"
                text={previewUrl}
                onCopy={() => snackbar.success('MCP URL copied')}
              />
              <UI.CopyableBlock
                label="Client config"
                meta="Add this to your MCP client (Claude Desktop, Cursor, …)"
                text={configSnippet}
                onCopy={() => snackbar.success('Config copied')}
              />
            </div>
          </McpModalBody>
        </UI.Modal>
      </div>
    </Wrapper>
  );
};
