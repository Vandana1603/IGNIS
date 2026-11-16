import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartRow } from '../lib/science';
import { formatNumber } from '../lib/science';

/** Only pass same-investigation rows for the SAME metric key, original column and unit. */
export function ScienceChart({ rows, label, unit }: {
  rows: ChartRow[]; label: string; unit: string;
}) {
  if (rows.length === 0) return null;
  return <div className="science-chart">
    <div className="chart-title"><strong>{label}</strong><span>Original unit: {unit}</span></div>
    <div className="chart-frame" role="img" aria-label={`Bar chart: ${label}, measured in ${unit}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="#21374c" strokeDasharray="3 6" vertical={false}/>
          <XAxis dataKey="test_id" tick={{ fill: '#8ba5b7', fontSize: 12 }} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fill: '#8ba5b7', fontSize: 12 }} axisLine={false} tickLine={false} width={58} domain={[0, 'auto']}/>
          <Tooltip contentStyle={{ background: '#10253a', border: '1px solid #2a4b64', borderRadius: 12, color: '#effaff' }}
            formatter={(value) => `${formatNumber(Number(value), 6)} ${unit}`}/>
          <Bar dataKey="value" fill="#4bd8e8" radius={[5, 5, 0, 0]} maxBarSize={74}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="chart-data-list" aria-label="Chart values">
      {rows.map((row) => <div key={row.id}><span>{row.test_id}</span><strong>{formatNumber(row.value, 6)} {unit}</strong></div>)}
    </div>
    <p className="chart-disclaimer">Descriptive visualization of imported NASA PSI table values. Differences do not establish causation.</p>
  </div>;
}
