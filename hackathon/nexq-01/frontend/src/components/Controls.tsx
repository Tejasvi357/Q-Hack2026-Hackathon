import React from 'react';
import { Play, Sparkles, Sliders, ShieldCheck, Zap, Cpu } from 'lucide-react';
import { SimulationRequest } from '../api';

interface ControlsProps {
  params: SimulationRequest;
  onChange: (updated: Partial<SimulationRequest>) => void;
  onRun: () => void;
  isLoading: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  params,
  onChange,
  onRun,
  isLoading,
}) => {
  // Preset noise profiles
  const applyPreset = (preset: 'heron' | 'ionq' | 'noisy' | 'ideal') => {
    switch (preset) {
      case 'heron':
        onChange({
          t1_time: 120.0,
          t2_time: 90.0,
          gate_error: 0.005,
          readout_error: 0.015,
        });
        break;
      case 'ionq':
        onChange({
          t1_time: 180.0,
          t2_time: 140.0,
          gate_error: 0.003,
          readout_error: 0.005,
        });
        break;
      case 'noisy':
        onChange({
          t1_time: 25.0,
          t2_time: 15.0,
          gate_error: 0.05,
          readout_error: 0.08,
        });
        break;
      case 'ideal':
        onChange({
          t1_time: 200.0,
          t2_time: 150.0,
          gate_error: 0.0,
          readout_error: 0.0,
        });
        break;
    }
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Quantum Setup & Noise</h2>
            <p className="text-xs text-slate-400">Configure circuit and NISQ decoherence</p>
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          Hardware Noise Profiles
        </label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyPreset('heron')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition text-left"
          >
            <span className="font-semibold text-cyan-400 block">IBM Heron</span>
            <span className="text-[10px] text-slate-400">Low Superconducting</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('ionq')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition text-left"
          >
            <span className="font-semibold text-purple-400 block">IonQ Forte</span>
            <span className="text-[10px] text-slate-400">Trapped-Ion High Coherence</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('noisy')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition text-left"
          >
            <span className="font-semibold text-rose-400 block">Heavy NISQ</span>
            <span className="text-[10px] text-slate-400">Decoherence Stress</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('ideal')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition text-left"
          >
            <span className="font-semibold text-emerald-400 block">Clean Ideal</span>
            <span className="text-[10px] text-slate-400">Zero-Noise Limit</span>
          </button>
        </div>
      </div>

      {/* Qubit Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-medium text-slate-300">
          <span>Target Qubits (N)</span>
          <span className="font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
            {params.num_qubits} Qubits ({1 << params.num_qubits} states)
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {[3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ num_qubits: n })}
              className={`py-2 rounded-lg text-xs font-mono font-bold transition ${
                params.num_qubits === n
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
              }`}
            >
              {n}Q
            </button>
          ))}
        </div>
      </div>

      {/* State Type Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-300">Entangled State Topology</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ state_type: 'ghz' })}
            className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
              params.state_type === 'ghz'
                ? 'bg-cyan-950/40 border-cyan-500/80 text-white shadow-sm shadow-cyan-500/20'
                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-cyan-400">GHZ State</span>
              <span className="text-[10px] font-mono text-slate-400">|0..0⟩ + |1..1⟩</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Maximally entangled Greenberger-Horne-Zeilinger state with macroscopic non-locality.
            </p>
          </button>
          <button
            type="button"
            onClick={() => onChange({ state_type: 'w' })}
            className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
              params.state_type === 'w'
                ? 'bg-cyan-950/40 border-cyan-500/80 text-white shadow-sm shadow-cyan-500/20'
                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-purple-400">W-State</span>
              <span className="text-[10px] font-mono text-slate-400">Σ|0..1..0⟩</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Single-excitation distributed superposition with high robustness against single-qubit loss.
            </p>
          </button>
        </div>
      </div>

      {/* Sliders Section */}
      <div className="flex flex-col gap-4 border-t border-slate-700/60 pt-4">
        {/* T1 Relaxation */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-300">T₁ Relaxation Time</span>
            <span className="font-mono text-cyan-400">{params.t1_time.toFixed(1)} μs</span>
          </div>
          <input
            type="range"
            min={10.0}
            max={200.0}
            step={5.0}
            value={params.t1_time}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              // Ensure T2 <= 2*T1
              const updatedT2 = Math.min(params.t2_time, 2.0 * val - 0.1);
              onChange({ t1_time: val, t2_time: updatedT2 });
            }}
            className="w-full accent-cyan-400 bg-slate-900 rounded-lg cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>10 μs</span>
            <span>200 μs</span>
          </div>
        </div>

        {/* T2 Dephasing */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-300">T₂ Dephasing Time</span>
            <span className="font-mono text-cyan-400">{params.t2_time.toFixed(1)} μs</span>
          </div>
          <input
            type="range"
            min={5.0}
            max={Math.min(150.0, 2.0 * params.t1_time - 0.1)}
            step={5.0}
            value={Math.min(params.t2_time, 2.0 * params.t1_time - 0.1)}
            onChange={(e) => onChange({ t2_time: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 bg-slate-900 rounded-lg cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>5 μs</span>
            <span>Max (2×T₁): {Math.min(150.0, 2.0 * params.t1_time - 0.1).toFixed(0)} μs</span>
          </div>
        </div>

        {/* 2-Qubit Gate Error */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-300">2-Qubit (CX) Gate Error</span>
            <span className="font-mono text-rose-400">{(params.gate_error * 100).toFixed(2)} %</span>
          </div>
          <input
            type="range"
            min={0.0}
            max={0.10}
            step={0.002}
            value={params.gate_error}
            onChange={(e) => onChange({ gate_error: parseFloat(e.target.value) })}
            className="w-full accent-rose-400 bg-slate-900 rounded-lg cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0.0% (Ideal)</span>
            <span>10.0%</span>
          </div>
        </div>

        {/* Readout Assignment Error */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-300">Readout Assignment Error</span>
            <span className="font-mono text-amber-400">{(params.readout_error * 100).toFixed(2)} %</span>
          </div>
          <input
            type="range"
            min={0.0}
            max={0.15}
            step={0.005}
            value={params.readout_error}
            onChange={(e) => onChange({ readout_error: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 bg-slate-900 rounded-lg cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0.0%</span>
            <span>15.0%</span>
          </div>
        </div>
      </div>

      {/* Auto-Mitigation Toggle */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${params.enable_mitigation ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white block">Auto-Mitigation</span>
            <span className="text-[10px] text-slate-400">ZNE (Richardson) + Readout Inversion</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ enable_mitigation: !params.enable_mitigation })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            params.enable_mitigation ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              params.enable_mitigation ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onRun}
        disabled={isLoading}
        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg ${
          isLoading
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-cyan-500/25 active:scale-[0.99]'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            <span>Simulating Quantum Circuit...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span>Run Verification Experiment</span>
          </>
        )}
      </button>
    </div>
  );
};
