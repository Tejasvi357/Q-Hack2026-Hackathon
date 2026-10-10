import axios from 'axios';

// Backend base URL: configured via environment variable or default local proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s timeout for multi-qubit simulations
});

export interface SimulationRequest {
  num_qubits: number;
  state_type: 'ghz' | 'w';
  t1_time: number;
  t2_time: number;
  gate_error: number;
  readout_error: number;
  enable_mitigation: boolean;
  shots: number;
}

export interface MABKAnalysisResult {
  mabk_value_raw: number;
  mabk_value_mitigated: number | null;
  classical_threshold: number;
  quantum_nonlocal: boolean;
  optimal_bases_used: string[];
  theoretical_max: number;
}

export interface SimulationResponse {
  ideal_counts: Record<string, number>;
  noisy_counts: Record<string, number>;
  mitigated_counts: Record<string, number> | null;
  fidelity_noisy: number;
  fidelity_mitigated: number | null;
  mabk_value: number;
  is_quantum_nonlocal: boolean;
  density_matrix_real: number[][];
  density_matrix_imag: number[][];
  mabk_details: MABKAnalysisResult | null;
  state_labels: string[];
  scale_factors: number[];
  zne_curve: Record<string, number[]> | null;
  circuit_depth: number;
  num_gates: number;
}

export interface HealthResponse {
  status: string;
  engine: string;
  version: string;
  platform: string;
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/api/health');
  return response.data;
}

export async function simulateQuantum(request: SimulationRequest): Promise<SimulationResponse> {
  const response = await apiClient.post<SimulationResponse>('/api/simulate', request);
  return response.data;
}
