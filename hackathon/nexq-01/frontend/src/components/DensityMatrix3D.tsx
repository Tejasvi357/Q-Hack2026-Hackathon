import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Box, Eye, Layers } from 'lucide-react';
import { SimulationResponse } from '../api';

interface DensityMatrix3DProps {
  data: SimulationResponse | null;
  isLoading: boolean;
}

export const DensityMatrix3D: React.FC<DensityMatrix3DProps> = ({
  data,
  isLoading,
}) => {
  const [viewMode, setViewMode] = useState<'real' | 'magnitude'>('real');
  const [colorScale, setColorScale] = useState<'Viridis' | 'Electric' | 'Tealrose'>('Viridis');

  // Prepare Z-matrix data and coordinate labels
  const { zMatrix, tickLabels, isDownsampled } = useMemo(() => {
    if (!data || !data.density_matrix_real || data.density_matrix_real.length === 0) {
      return { zMatrix: [], tickLabels: [], isDownsampled: false };
    }

    const rawReal = data.density_matrix_real;
    const rawImag = data.density_matrix_imag;
    const dim = rawReal.length;

    // If dimension is very large (e.g. 2^6 = 64, 2^8 = 256), slice or downsample for smooth GPU rendering
    const maxDim = 32;
    const shouldDownsample = dim > maxDim;
    const effectiveDim = shouldDownsample ? maxDim : dim;

    const z: number[][] = [];
    for (let r = 0; r < effectiveDim; r++) {
      const row: number[] = [];
      for (let c = 0; c < effectiveDim; c++) {
        const re = rawReal[r][c];
        const im = rawImag?.[r]?.[c] ?? 0;

        if (viewMode === 'real') {
          row.push(re);
        } else {
          row.push(Math.sqrt(re * re + im * im));
        }
      }
      z.push(row);
    }

    const labels = data.state_labels.slice(0, effectiveDim);

    return {
      zMatrix: z,
      tickLabels: labels,
      isDownsampled: shouldDownsample,
    };
  }, [data, viewMode]);

  if (isLoading) {
    return (
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl h-[460px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Reconstructing quantum state tomography ρ...</span>
        </div>
      </div>
    );
  }

  if (!data || zMatrix.length === 0) {
    return (
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl h-[460px] flex items-center justify-center text-slate-500 text-sm">
        Run simulation to render 3D Density Matrix Tomography.
      </div>
    );
  }

  const surfaceTrace: Plotly.Data = {
    z: zMatrix,
    x: tickLabels,
    y: tickLabels,
    type: 'surface',
    colorscale: colorScale,
    contours: {
      z: {
        show: true,
        usecolormap: true,
        highlightcolor: '#38bdf8',
        project: { z: true },
      },
    },
    lighting: {
      ambient: 0.7,
      diffuse: 0.8,
      specular: 0.5,
      roughness: 0.3,
    },
    hoverinfo: 'x+y+z',
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">3D Density Matrix Tomography</h2>
            <p className="text-xs text-slate-400">
              State reconstruction across 2ᴺ × 2ᴺ computational basis elements
            </p>
          </div>
        </div>

        {/* View Options */}
        <div className="flex items-center gap-2 text-xs">
          {isDownsampled && (
            <span className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 text-[10px] font-mono">
              Displaying first 32×32 subspace
            </span>
          )}

          <div className="flex rounded-lg bg-slate-900 border border-slate-700 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('real')}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                viewMode === 'real'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Re(ρ)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('magnitude')}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                viewMode === 'magnitude'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              |ρ|
            </button>
          </div>

          <select
            value={colorScale}
            onChange={(e) => setColorScale(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="Viridis">Viridis</option>
            <option value="Electric">Electric</option>
            <option value="Tealrose">Tealrose</option>
          </select>
        </div>
      </div>

      {/* 3D Surface Plot */}
      <div className="w-full h-[400px]">
        <Plot
          data={[surfaceTrace]}
          layout={{
            autosize: true,
            margin: { l: 10, r: 10, t: 10, b: 10 },
            paper_bgcolor: 'transparent',
            scene: {
              xaxis: {
                title: 'State ⟨k|',
                titlefont: { size: 10, color: '#94a3b8' },
                tickfont: { size: 8, color: '#64748b', family: 'JetBrains Mono' },
                gridcolor: '#1e293b',
                zerolinecolor: '#334155',
                showbackground: true,
                backgroundcolor: '#090d16',
              },
              yaxis: {
                title: 'State |j⟩',
                titlefont: { size: 10, color: '#94a3b8' },
                tickfont: { size: 8, color: '#64748b', family: 'JetBrains Mono' },
                gridcolor: '#1e293b',
                zerolinecolor: '#334155',
                showbackground: true,
                backgroundcolor: '#090d16',
              },
              zaxis: {
                title: viewMode === 'real' ? 'Re(ρⱼₖ)' : '|ρⱼₖ|',
                titlefont: { size: 10, color: '#94a3b8' },
                tickfont: { size: 8, color: '#94a3b8' },
                gridcolor: '#1e293b',
                zerolinecolor: '#334155',
                showbackground: true,
                backgroundcolor: '#090d16',
              },
              camera: {
                eye: { x: 1.6, y: 1.6, z: 1.2 },
              },
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
