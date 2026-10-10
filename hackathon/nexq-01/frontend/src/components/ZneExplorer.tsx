import React from 'react';
import Plot from 'react-plotly.js';
import { TrendingDown, Sparkles } from 'lucide-react';
import { SimulationResponse } from '../api';

interface ZneExplorerProps {
  data: SimulationResponse | null;
  isLoading: boolean;
}

export const ZneExplorer: React.FC<ZneExplorerProps> = ({ data, isLoading }) => {
  if (isLoading || !data || !data.zne_curve) {
    return null;
  }

  const zneCurve = data.zne_curve;
  const scaleFactors = zneCurve['scale_factors'] || [0.0, 1.0, 3.0, 5.0];
  const keys = Object.keys(zneCurve).filter((k) => k !== 'scale_factors');

  if (keys.length === 0) return null;

  const colorPalette = ['#06b6d4', '#10b981', '#a855f7', '#f59e0b'];

  const traces: Plotly.Data[] = keys.map((bitstring, idx) => {
    const yVals = zneCurve[bitstring];
    const color = colorPalette[idx % colorPalette.length];

    return {
      x: scaleFactors,
      y: yVals,
      name: `|${bitstring}⟩ Extrapolation`,
      type: 'scatter',
      mode: 'lines+markers',
      line: {
        color: color,
        width: 2.5,
        dash: 'dashdot',
      },
      marker: {
        size: [10, 7, 7, 7], // Large highlight on lambda=0
        color: color,
        symbol: ['diamond', 'circle', 'circle', 'circle'],
      },
      hovertemplate: `State |${bitstring}⟩<br>Noise Factor λ = %{x}<br>Prob = %{y:.4f}<extra></extra>`,
    };
  });

  return (
    <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">ZNE Richardson Extrapolation Curves</h2>
            <p className="text-xs text-slate-400">
              Tracing noise amplification (1×, 3×, 5×) and polynomial extrapolation to zero-noise limit (λ → 0)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-950/60 border border-teal-700/50 text-[11px] font-mono text-teal-300">
          <Sparkles className="w-3 h-3 text-teal-400" />
          <span>Richardson Polynomial Extrapolation</span>
        </div>
      </div>

      <div className="w-full h-[280px]">
        <Plot
          data={traces}
          layout={{
            autosize: true,
            margin: { l: 50, r: 20, t: 20, b: 50 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
              family: 'Plus Jakarta Sans, sans-serif',
              color: '#94a3b8',
              size: 11,
            },
            xaxis: {
              title: 'Noise Scale Factor (λ)',
              tickvals: [0.0, 1.0, 3.0, 5.0],
              ticktext: ['0× (Mitigated Zero-Noise)', '1× (Base)', '3× (Folded)', '5× (Folded)'],
              tickfont: { color: '#cbd5e1', size: 10, family: 'JetBrains Mono' },
              gridcolor: '#1e293b',
              zerolinecolor: '#38bdf8',
            },
            yaxis: {
              title: 'Target State Probability P(x)',
              tickfont: { color: '#94a3b8', size: 10 },
              gridcolor: '#1e293b',
            },
            legend: {
              orientation: 'h',
              x: 0.5,
              xanchor: 'center',
              y: 1.15,
              font: { color: '#e2e8f0', size: 11 },
            },
            hoverlabel: {
              bgcolor: '#0f172a',
              bordercolor: '#14b8a6',
              font: { family: 'JetBrains Mono', color: '#f8fafc', size: 11 },
            },
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{
            responsive: true,
            displayModeBar: false,
          }}
        />
      </div>
    </div>
  );
};
