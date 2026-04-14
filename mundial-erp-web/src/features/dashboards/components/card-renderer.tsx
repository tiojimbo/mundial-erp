'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  RiArrowUpSLine,
  RiArrowDownSLine,
  RiSubtractLine,
} from '@remixicon/react';
import { formatCents } from '@/lib/formatters';
import type { CardType, CardDataResponse } from '../types/dashboard.types';

const CHART_COLORS = [
  'var(--color-primary-base)',
  'var(--color-state-success-base)',
  'var(--color-state-warning-base)',
  'var(--color-state-error-base)',
  'var(--color-state-feature-base)',
  'var(--color-state-verified-base)',
  'var(--color-state-highlighted-base)',
  'var(--color-state-stable-base)',
];

type CardRendererProps = {
  type: CardType;
  title: string;
  data: CardDataResponse | undefined;
  isLoading: boolean;
};

export function CardRenderer({ type, title, data, isLoading }: CardRendererProps) {
  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary-base border-t-transparent' />
      </div>
    );
  }

  if (!data || !data.points.length) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-1 text-text-soft-400'>
        <p className='text-paragraph-xs'>Sem dados</p>
      </div>
    );
  }

  switch (type) {
    case 'KPI_NUMBER':
      return <KPICard title={title} data={data} />;
    case 'BAR_CHART':
      return <BarChartCard data={data} />;
    case 'LINE_CHART':
      return <LineChartCard data={data} />;
    case 'PIE_CHART':
      return <PieChartCard data={data} />;
    case 'DONUT':
      return <DonutCard data={data} />;
    case 'AREA_CHART':
      return <AreaChartCard data={data} />;
    case 'STACKED_BAR':
      return <StackedBarCard data={data} />;
    case 'TABLE':
      return <TableCard data={data} />;
    default:
      return null;
  }
}

function KPICard({ title, data }: { title: string; data: CardDataResponse }) {
  const mainValue = data.total ?? data.points[0]?.value ?? 0;
  const trend = data.trend;

  return (
    <div className='flex h-full flex-col justify-center px-2'>
      <p className='text-paragraph-xs text-text-sub-600'>{title}</p>
      <p className='text-title-h4 text-text-strong-950'>
        {formatCents(mainValue)}
      </p>
      {trend && (
        <div className='mt-1 flex items-center gap-1'>
          {trend.direction === 'up' && (
            <RiArrowUpSLine className='size-4 text-state-success-base' />
          )}
          {trend.direction === 'down' && (
            <RiArrowDownSLine className='size-4 text-state-error-base' />
          )}
          {trend.direction === 'neutral' && (
            <RiSubtractLine className='size-4 text-text-soft-400' />
          )}
          <span
            className={`text-paragraph-xs ${
              trend.direction === 'up'
                ? 'text-state-success-base'
                : trend.direction === 'down'
                  ? 'text-state-error-base'
                  : 'text-text-soft-400'
            }`}
          >
            {trend.value > 0 ? '+' : ''}
            {trend.value.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

function BarChartCard({ data }: { data: CardDataResponse }) {
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <BarChart data={data.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='var(--color-stroke-soft-200)' />
        <XAxis dataKey='label' tick={{ fontSize: 11 }} stroke='var(--color-text-soft-400)' />
        <YAxis tick={{ fontSize: 11 }} stroke='var(--color-text-soft-400)' />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--color-stroke-soft-200)',
            fontSize: 12,
          }}
        />
        <Bar dataKey='value' fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartCard({ data }: { data: CardDataResponse }) {
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <LineChart data={data.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='var(--color-stroke-soft-200)' />
        <XAxis dataKey='label' tick={{ fontSize: 11 }} stroke='var(--color-text-soft-400)' />
        <YAxis tick={{ fontSize: 11 }} stroke='var(--color-text-soft-400)' />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--color-stroke-soft-200)',
            fontSize: 12,
          }}
        />
        <Line
          type='monotone'
          dataKey='value'
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartCard({ data }: { data: CardDataResponse }) {
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <PieChart>
        <Pie
          data={data.points}
          cx='50%'
          cy='50%'
          outerRadius='80%'
          dataKey='value'
          nameKey='label'
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
          style={{ fontSize: 11 }}
        >
          {data.points.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--color-stroke-soft-200)',
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function DonutCard({ data }: { data: CardDataResponse }) {
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <PieChart>
        <Pie
          data={data.points}
          cx='50%'
          cy='50%'
          innerRadius='50%'
          outerRadius='80%'
          dataKey='value'
          nameKey='label'
        >
          {data.points.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--color-stroke-soft-200)',
            fontSize: 12,
          }}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function AreaChartCard({ data }: { data: CardDataResponse }) {
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <AreaChart data={data.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='var(--color-stroke-soft-200)' />
        <XAxis dataKey='label' tick={{ fontSize: 11 }} stroke='var(--color-text-soft-400)' />
        <YAxis tick={{ fontSize: 11 }} stroke='var(--color-text-soft-400)' />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--color-stroke-soft-200)',
            fontSize: 12,
          }}
        />
        <Area
          type='monotone'
          dataKey='value'
          stroke={CHART_COLORS[0]}
          fill={CHART_COLORS[0]}
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function StackedBarCard({ data }: { data: CardDataResponse }) {
  const groups = [...new Set(data.points.map((p) => p.group).filter(Boolean))];

  if (groups.length === 0) {
    return <BarChartCard data={data} />;
  }

  const grouped = data.points.reduce<Record<string, Record<string, number>>>(
    (acc, point) => {
      const key = point.label;
      if (!acc[key]) acc[key] = { label: key } as Record<string, number>;
      if (point.group) acc[key][point.group] = point.value;
      return acc;
    },
    {},
  );

  const chartData = Object.values(grouped);

  return (
    <ResponsiveContainer width='100%' height='100%'>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='var(--color-stroke-soft-200)' />
        <XAxis dataKey='label' tick={{ fontSize: 11 }} stroke='var(--color-text-soft-400)' />
        <YAxis tick={{ fontSize: 11 }} stroke='var(--color-text-soft-400)' />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--color-stroke-soft-200)',
            fontSize: 12,
          }}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {groups.map((group, i) => (
          <Bar
            key={group}
            dataKey={group as string}
            stackId='stack'
            fill={CHART_COLORS[i % CHART_COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function TableCard({ data }: { data: CardDataResponse }) {
  return (
    <div className='h-full overflow-auto'>
      <table className='w-full text-left'>
        <thead>
          <tr className='border-b border-stroke-soft-200'>
            <th className='pb-2 text-label-xs text-text-sub-600'>Item</th>
            <th className='pb-2 text-right text-label-xs text-text-sub-600'>
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {data.points.map((point, i) => (
            <tr key={i} className='border-b border-stroke-soft-200 last:border-0'>
              <td className='py-2 text-paragraph-xs text-text-strong-950'>
                {point.label}
              </td>
              <td className='py-2 text-right text-paragraph-xs text-text-strong-950'>
                {formatCents(point.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
