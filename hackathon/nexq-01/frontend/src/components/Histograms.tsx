import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { BarChart3, Filter, Percent, Hash } from 'lucide-react';
import { SimulationResponse } from '../api';

interface HistogramsProps {
  data: SimulationResponse | null;
  isLoading: boolean;
  totalShots?: number;
}

export const Histograms: React.FC<HistogramsProps> = ({
  data,
  isLoading,
  totalShots = 2048,
}) => {
  const [showPercentages, setShowPercentages] = useState(true);
  const [filterDominant, setFilterDominant] = useState(true);

  // Process and sort states for the grouped histogram
  const { labels, idealVals, noisyVals, mitVals } = useMemo(() => {
    if (!data) {
      return { labels: [], idealVals: [], noisyVals: [], mitVals: [] };
    }

    const allKeys = new Set<string>([
      ...Object.keys(data.ideal_counts),
      ...Object.keys(data.noisy_counts),
      ...(data.mitigated_counts ? Object.keys(data.mitigated_counts) : []),
    ]);

    const stateList = Array.from(allKeys);

    // Score states by peak occurrence to prioritize dominant entangled states
    stateList.sort((a, b) => {
      const maxA = Math.max(
        data.ideal_counts[a] || 0,
        data.noisy_counts[a] || 0,
        data.mitigated_counts?.[a] || 0
      );
      const maxB = Math.max(
        data.ideal_counts[b] || 0,
        data.noisy_counts[b] || 0,
        data.mitigated_counts?.[b] || 0
      );
      return maxB - maxA;
    });

    // If filtering, display top 12 states if state count is large
    const displayStates = filterDominant && stateList.length > 12 ? stateList.slice(0, 12) : stateList;

    // Convert to probabilities or raw counts
    const factor = showPercentages ? 1.0 / totalShots : 1.0;

    const iVals = displayStates.map((k) => (data.ideal_counts[k] || 0) * factor);
    const nVals = displayStates.map((k) => (data.noisy_counts[k] || 0) * factor);
    const mVals = data.mitigated_counts
      ? displayStates.map((k) => (data.mitigated_counts?.[k] || 0) * factor)
      : null;

    const formattedLabels = displayStates.map((k) => `|${k}⟩`);

    return {
      labels: formattedLabels,
      idealVals: iVals,
      noisyVals: nVals,
      mitVals: mVals,
    };
  }, [data, showPercentages, filterDominant, totalShots]);

  if (isLoading) {
    return (
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl h-[420px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Aggregating shot histograms...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl h-[420px] flex items-center justify-center text-slate-500 text-sm">
        Run simulation to view grouped distribution comparison.
      </div>
    );
  }

  // Plotly Traces
  const traces: Plotly.Data[] = [
    {
      x: labels,
      y: idealVals,
      name: 'Ideal (Clean)',
      type: 'bar',
      marker: {
        color: '#06b6d4', // Cyan
        opacity: 0.9,
      },
      hovertemplate: `<b>%{x}</b><br>Ideal: %{y:.3f}<extra></extra>`,
    },
    {
      x: labels,
      y: noisyVals,
      name: 'Noisy Execution',
      type: 'bar',
      marker: {
        color: '#f43f5e', // Rose
        opacity: 0.85,
      },
      hovertemplate: `<b>%{x}</b><br>Noisy: %{y:.3f}<extra></extra>`,
    },
  ];

  if (mitVals) {
    traces.push({
      x: labels,
      y: mitVals,
      name: 'Mitigated Signal (ZNE + Readout)',
      type: 'bar',
      marker: {
        color: '#10b981', // Emerald
        opacity: 0.95,
      },
      hovertemplate: `<b>%{x}</b><br>Mitigated: %{y:.3f}<extra></extra>`,
    });
  }

  return (
    <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
      {/* Title & Toolbars */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Quantum State Output Distribution</h2>
            <p className="text-xs text-slate-400">
              Side-by-side verification: Ideal vs. Noisy vs. Mitigated
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setFilterDominant(!filterDominant)}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium transition ${
              filterDominant
                ? 'bg-cyan-950/60 border-cyan-700/80 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{filterDominant ? 'Dominant States' : 'All Basis States'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPercentages(!showPercentages)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 font-medium transition"
          >
            {showPercentages ? <Percent className="w-3.5 h-3.5 text-cyan-400" /> : <Hash className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{showPercentages ? 'Probability' : 'Raw Shots'}</span>
          </button>
        </div>
      </div>

      {/* Plotly Chart Container */}
      <div className="w-full h-[380px]">
        <Plot
          data={traces}
          layout={{
            barmode: 'group',
            autosize: true,
            margin: { l: 50, r: 20, t: 20, b: 60 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
              family: 'Plus Jakarta Sans, sans-serif',
              color: '#94a3b8',
              size: 11,
            },
            xaxis: {
              tickfont: { color: '#cbd5e1', size: 11, family: 'JetBrains Mono, monospace' },
              gridcolor: '#334155',
              zerolinecolor: '#475569',
              showgrid: false,
            },
            yaxis: {
              title: showPercentages ? 'Probability P(x)' : 'Measured Shot Counts',
              tickfont: { color: '#94a3b8', size: 10 },
              gridcolor: '#1e293b',
              zerolinecolor: '#334155',
              showgrid: true,
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
              bordercolor: '#38bdf8',
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
