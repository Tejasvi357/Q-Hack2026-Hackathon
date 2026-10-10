import React from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Cpu,
  Layers,
} from 'lucide-react';
import { SimulationResponse } from '../api';

interface MetricsPanelProps {
  data: SimulationResponse | null;
  isLoading: boolean;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 rounded-2xl bg-slate-800/40 border border-slate-700/50 animate-pulse flex items-center justify-center text-slate-500 text-xs font-mono"
          >
            Evaluating quantum metrics...
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-center text-slate-400 text-sm">
        Configure hardware noise parameters and click <span className="text-cyan-400 font-semibold">"Run Verification Experiment"</span> to calculate Quantum State Fidelity and MABK Non-Locality.
      </div>
    );
  }

  const noisyFid = data.fidelity_noisy * 100;
  const mitFid = data.fidelity_mitigated !== null ? data.fidelity_mitigated * 100 : null;
  const fidDelta = mitFid !== null ? mitFid - noisyFid : 0;

  const sVal = data.mabk_value;
  const sMit = data.mabk_details?.mabk_value_mitigated ?? null;
  const effectiveS = sMit !== null ? sMit : sVal;
  const isNonlocal = effectiveS > 2.0;
  const theoMax = data.mabk_details?.theoretical_max ?? 4.0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Quantum State Fidelity Card */}
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Quantum State Fidelity (F)
              </h3>
            </div>
            {mitFid !== null && fidDelta > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +{fidDelta.toFixed(1)}%
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold font-mono text-white">
              {mitFid !== null ? `${mitFid.toFixed(1)}%` : `${noisyFid.toFixed(1)}%`}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {mitFid !== null ? '(Mitigated)' : '(Raw Noisy)'}
            </span>
          </div>

          {/* Progress / Gauge Bars */}
          <div className="space-y-2 mt-4">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Raw Noisy Fidelity</span>
                <span className="font-mono text-rose-400 font-semibold">{noisyFid.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(2, noisyFid))}%` }}
                />
              </div>
            </div>

            {mitFid !== null && (
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-emerald-400 font-medium">ZNE + Inversion Restored</span>
                  <span className="font-mono text-emerald-400 font-bold">{mitFid.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(2, mitFid))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mt-4 leading-relaxed border-t border-slate-700/50 pt-2">
          Uhlmann overlap fidelity <code className="text-slate-400">Tr(√(√ρ₁ ρ₂ √ρ₁))²</code> comparing reconstructed density matrix to pure state.
        </p>
      </div>

      {/* 2. MABK Bell Witness Card */}
      <div className={`backdrop-blur-md rounded-2xl p-5 shadow-lg flex flex-col justify-between border ${
        isNonlocal
          ? 'bg-slate-800/80 border-emerald-500/40 shadow-emerald-950/20'
          : 'bg-slate-800/80 border-rose-500/40 shadow-rose-950/20'
      }`}>
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border ${
                isNonlocal
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {isNonlocal ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                MABK Bell Witness (S)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
              Limit: S &gt; 2.0
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-3xl font-extrabold font-mono ${
              isNonlocal ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {effectiveS.toFixed(3)}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {theoMax.toFixed(2)} (Max)
            </span>
          </div>

          {/* Non-locality status badge */}
          <div className="mt-3">
            {isNonlocal ? (
              <div className="px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-600/50 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-300 block">
                    Quantum Entanglement Verified
                  </span>
                  <span className="text-[10px] text-emerald-400/80">
                    Non-local Bell inequality violation confirmed (S = {effectiveS.toFixed(2)} &gt; 2.0)
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-600/50 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-rose-300 block">
                    Classical Decoherence Collapse
                  </span>
                  <span className="text-[10px] text-rose-400/80">
                    S ≤ 2.0 satisfies Local Hidden Variables due to hardware noise
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mt-4 leading-relaxed border-t border-slate-700/50 pt-2">
          Mermin-Ardehali-Belinskii-Klyshko operator evaluating multi-particle entanglement across orthogonal measurement bases.
        </p>
      </div>

      {/* 3. Hardware Circuit & Mitigation Card */}
      <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Circuit & Error Mitigation
              </h3>
            </div>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
              NISQ Layer
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block font-sans">Circuit Depth</span>
              <span className="text-base font-bold text-white">{data.circuit_depth}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
              <span className="text-[10px] text-slate-400 block font-sans">Total Gates</span>
              <span className="text-base font-bold text-cyan-400">{data.num_gates}</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 mt-3">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">ZNE Pulse Scaling:</span>
              <span className="font-mono text-slate-200">λ ∈ {'{1.0, 3.0, 5.0}'}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Extrapolation Order:</span>
              <span className="font-mono text-slate-200">Richardson Degree-2</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Readout Calibration:</span>
              <span className="font-mono text-emerald-400">Bounded LSQ Inversion</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mt-4 leading-relaxed border-t border-slate-700/50 pt-2">
          Automated gate folding and inverse measurement operator calibration suppress coherent & asymmetric bit-flip errors.
        </p>
      </div>
    </div>
  );
};
