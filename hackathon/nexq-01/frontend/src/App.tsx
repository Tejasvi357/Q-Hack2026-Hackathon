import React, { useState, useEffect } from 'react';
import {
  Atom,
  Server,
  Github,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Controls } from './components/Controls';
import { MetricsPanel } from './components/MetricsPanel';
import { Histograms } from './components/Histograms';
import { DensityMatrix3D } from './components/DensityMatrix3D';
import { ZneExplorer } from './components/ZneExplorer';
import {
  SimulationRequest,
  SimulationResponse,
  checkBackendHealth,
  simulateQuantum,
} from './api';

export const App: React.FC = () => {
  // State configuration
  const [params, setParams] = useState<SimulationRequest>({
    num_qubits: 3,
    state_type: 'ghz',
    t1_time: 50.0,
    t2_time: 30.0,
    gate_error: 0.01,
    readout_error: 0.03,
    enable_mitigation: true,
    shots: 2048,
  });

  const [data, setData] = useState<SimulationResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'zne_curves'>('dashboard');

  // Verify backend health on startup
  const checkHealth = async () => {
    try {
      setBackendStatus('checking');
      const res = await checkBackendHealth();
      if (res && res.status === 'online') {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (err) {
      setBackendStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Run simulation handler
  const handleRunSimulation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await simulateQuantum(params);
      setData(result);
      setBackendStatus('online');
    } catch (err: any) {
      console.error('Simulation execution failed:', err);
      const detail = err.response?.data?.detail || err.message || 'Simulation failed.';
      setError(`Backend error: ${detail}. Please ensure the Python FastAPI backend is running on port 8000.`);
      setBackendStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParamChange = (updated: Partial<SimulationRequest>) => {
    setParams((prev) => ({ ...prev, ...updated }));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-400">
                <Atom className="w-6 h-6 animate-[spin_12s_linear_infinite]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                  NexQ-01
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-semibold tracking-wider">
                  v1.0.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Quantum Verification & Error Mitigation Engine
              </p>
            </div>
          </div>

          {/* Engine Status & Badges */}
          <div className="flex items-center gap-3">
            {/* Active Engine Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Backend:</span>
              <span className="font-mono text-cyan-300 font-medium">Qiskit Aer Simulator</span>
            </div>

            {/* Backend Health Status Pill */}
            <div
              onClick={checkHealth}
              title="Click to re-check backend connection"
              className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
                backendStatus === 'online'
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400 hover:bg-emerald-950/70'
                  : backendStatus === 'checking'
                  ? 'bg-amber-950/40 border-amber-700/60 text-amber-400 hover:bg-amber-950/70'
                  : 'bg-rose-950/40 border-rose-700/60 text-rose-400 hover:bg-rose-950/70'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'online'
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse'
                    : backendStatus === 'checking'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-400'
                }`}
              />
              <span className="capitalize font-semibold">{backendStatus}</span>
              <RefreshCw className="w-3 h-3 text-slate-400" />
            </div>

            {/* GitHub Documentation */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
              title="View on GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-[1700px] mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex flex-col gap-6">
        {/* Error notification banner if any */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-600/70 text-rose-300 flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold block text-sm text-rose-200">Execution Error</span>
              <p className="mt-0.5 text-rose-300">{error}</p>
            </div>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Controls */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <Controls
              params={params}
              onChange={handleParamChange}
              onRun={handleRunSimulation}
              isLoading={isLoading}
            />
          </aside>

          {/* Right Column: Visualization Panels */}
          <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            {/* Top: Metrics Panel (Fidelity & MABK Witness) */}
            <MetricsPanel data={data} isLoading={isLoading} />

            {/* Middle: Grouped Output Histogram */}
            <Histograms
              data={data}
              isLoading={isLoading}
              totalShots={params.shots}
            />

            {/* Bottom Row: 3D Density Matrix Tomography & Optional ZNE Curves */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <DensityMatrix3D data={data} isLoading={isLoading} />
              <ZneExplorer data={data} isLoading={isLoading} />
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/50 py-4 mt-auto">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">NexQ-01 Platform</span>
            <span>—</span>
            <span>Quantum Verification, MABK Non-Locality & Zero-Noise Extrapolation</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            NISQ-Era Ready • Qiskit Aer Engine • FastAPI • React 18
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
