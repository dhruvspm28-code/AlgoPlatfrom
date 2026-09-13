import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Chart wrappers.
 * Every chart in the product goes through this module so axes, grids and
 * tooltips stay visually identical.
 */

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 12,
    fontSize: 12,
    boxShadow: "var(--shadow-elevated)",
  },
  labelStyle: { color: "var(--color-muted-foreground)", marginBottom: 4 },
};

export function AreaSeries({
  data,
  dataKey = "price",
  height = 280,
  xKey = "label",
  compare,
  color,
  gradientId,
}: {
  data: Array<Record<string, unknown>>;
  dataKey?: string;
  height?: number;
  xKey?: string;
  compare?: string;
  color?: string;
  gradientId?: string;
}) {
  const gradId = gradientId || "qeFill";
  const strokeColor = color || "var(--color-primary)";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.45} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={28} />
        <YAxis {...axis} width={56} domain={["auto", "auto"]} />
        <Tooltip {...tooltipStyle} />
        {compare && (
          <Area
            type="monotone"
            dataKey={compare}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            fill="none"
            strokeWidth={1.5}
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={strokeColor}
          strokeWidth={2.4}
          fill={`url(#${gradId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({
  data,
  positive = true,
}: {
  data: Array<{ price: number }>;
  positive?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={38}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="price"
          dot={false}
          strokeWidth={1.8}
          stroke={positive ? "var(--color-bull)" : "var(--color-bear)"}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ReturnsBars({
  data,
  height = 240,
}: {
  data: Array<{ month: string; ret: number }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" {...axis} />
        <YAxis {...axis} width={44} unit="%" />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.35 }} />
        <Bar dataKey="ret" radius={[6, 6, 6, 6]}>
          {data.map((d) => (
            <Cell key={d.month} fill={d.ret >= 0 ? "var(--color-bull)" : "var(--color-bear)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AllocationPie({
  data,
  height = 260,
}: {
  data: Array<{ name: string; value: number; fill: string }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip {...tooltipStyle} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="88%"
          paddingAngle={3}
          stroke="none"
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DrawdownArea({
  data,
  height = 200,
}: {
  data: Array<{ label: string; drawdown: number }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-bear)" stopOpacity={0.05} />
            <stop offset="100%" stopColor="var(--color-bear)" stopOpacity={0.45} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={28} />
        <YAxis {...axis} width={48} unit="%" />
        <Tooltip {...tooltipStyle} />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke="var(--color-bear)"
          strokeWidth={1.8}
          fill="url(#ddFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
