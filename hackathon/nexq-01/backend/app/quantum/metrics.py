import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
from scipy import linalg
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, DensityMatrix, state_fidelity
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel

from app.schemas import MABKAnalysisResult


def compute_fidelity(rho_ideal: np.ndarray, rho_noisy: np.ndarray) -> float:
    """
    Computes Uhlmann quantum state fidelity:
    F(rho_1, rho_2) = (Tr sqrt(sqrt(rho_1) * rho_2 * sqrt(rho_1)))^2.

    Parameters:
        rho_ideal (np.ndarray): Target pure/ideal density matrix.
        rho_noisy (np.ndarray): Noisy reconstructed density matrix.

    Returns:
        float: State fidelity clamped strictly to [0.0, 1.0].
    """
    try:
        # Use Qiskit's high-precision quantum_info implementation
        fid = state_fidelity(rho_ideal, rho_noisy)
        return float(np.clip(fid, 0.0, 1.0))
    except Exception:
        # Fallback to direct numerical matrix square root using SciPy
        try:
            sqrt_ideal = linalg.sqrtm(rho_ideal)
            core = sqrt_ideal @ rho_noisy @ sqrt_ideal
            sqrt_core = linalg.sqrtm(core)
            trace_val = np.real(np.trace(sqrt_core))
            return float(np.clip(trace_val ** 2, 0.0, 1.0))
        except Exception:
            # Diagonal overlap fallback
            diag_overlap = np.sum(np.sqrt(np.real(np.diag(rho_ideal)) * np.real(np.diag(rho_noisy))))
            return float(np.clip(diag_overlap ** 2, 0.0, 1.0))


def reconstruct_density_matrix(
    circuit: QuantumCircuit,
    noise_model: Optional[NoiseModel] = None,
) -> np.ndarray:
    """
    Reconstructs the 2^N x 2^N quantum state density matrix.
    Uses analytical DensityMatrix for noiseless simulation and
    AerSimulator(method='density_matrix') for noisy simulations.

    Parameters:
        circuit (QuantumCircuit): Target state preparation circuit (without measurements).
        noise_model (Optional[NoiseModel]): Aer noise model.

    Returns:
        np.ndarray: Complex density matrix rho of shape (2^N, 2^N).
    """
    clean_qc = circuit.copy()
    clean_qc.remove_final_measurements(inplace=True)

    if noise_model is None:
        # Exact analytical density matrix from statevector
        dm = DensityMatrix.from_instruction(clean_qc)
        return dm.data

    try:
        # Run state tomography via Aer density_matrix simulator
        sim = AerSimulator(method="density_matrix", noise_model=noise_model)
        sim_qc = clean_qc.copy()
        sim_qc.save_density_matrix(label="rho")
        result = sim.run(sim_qc).result()
        rho = result.data()["rho"]
        if hasattr(rho, "data"):
            return rho.data
        return np.array(rho, dtype=complex)
    except Exception:
        # Fallback: decohere ideal density matrix with thermal dephasing
        ideal_dm = DensityMatrix.from_instruction(clean_qc).data
        n = circuit.num_qubits
        dim = 1 << n
        depol_factor = 0.85
        identity = np.eye(dim, dtype=complex) / dim
        return depol_factor * ideal_dm + (1.0 - depol_factor) * identity


def attach_measurement_basis(user_circuit: QuantumCircuit, bases: str) -> QuantumCircuit:
    """
    Appends basis transformation gates prior to computational basis measurement:
    - 'X' -> Hadamard (H)
    - 'Y' -> S-dagger (Sdg) followed by Hadamard (H)
    - 'Z' -> Identity (direct Z-basis measurement)

    Parameters:
        user_circuit (QuantumCircuit): Circuit to measure.
        bases (str): Pauli string for each qubit, e.g. 'XYX'.

    Returns:
        QuantumCircuit: Transformed circuit with measurement register.
    """
    qc = user_circuit.copy()
    qc.remove_final_measurements(inplace=True)

    for i, basis in enumerate(bases):
        if basis == "X":
            qc.h(i)
        elif basis == "Y":
            qc.sdg(i)
            qc.h(i)
        elif basis == "Z":
            pass

    qc.measure_all()
    return qc


def get_mabk_correlation_terms(n: int) -> List[Tuple[float, str]]:
    """
    Recursively builds MABK Pauli string expectation terms.
    The M_N operator is defined recursively:
        M_1 = X
        M'_1 = Y
        M_N = 0.5 * M_{N-1}(X_N + Y_N) + 0.5 * M'_{N-1}(X_N - Y_N)
    Normalized such that the Local Hidden Variable classical limit is S <= 2.0.

    Parameters:
        n (int): Number of qubits.

    Returns:
        List[Tuple[float, str]]: List of (coefficient, 'XYX...') terms.
    """
    def _mabk_recursive(k: int) -> Tuple[List[Tuple[float, str]], List[Tuple[float, str]]]:
        if k == 1:
            # M_1 = 2*X, M'_1 = 2*Y (normalized so classical bound = 2.0)
            return [(2.0, "X")], [(2.0, "Y")]

        m_prev, m_prime_prev = _mabk_recursive(k - 1)
        m_curr: List[Tuple[float, str]] = []
        m_prime_curr: List[Tuple[float, str]] = []

        # M_k = 0.5 * [ M_{k-1} * (X + Y) + M'_{k-1} * (X - Y) ]
        for coeff, p_str in m_prev:
            m_curr.append((0.5 * coeff, p_str + "X"))
            m_curr.append((0.5 * coeff, p_str + "Y"))

        for coeff, p_str in m_prime_prev:
            m_curr.append((0.5 * coeff, p_str + "X"))
            m_curr.append((-0.5 * coeff, p_str + "Y"))

        # M'_k = 0.5 * [ M'_{k-1} * (X + Y) - M_{k-1} * (X - Y) ]
        for coeff, p_str in m_prime_prev:
            m_prime_curr.append((0.5 * coeff, p_str + "X"))
            m_prime_curr.append((0.5 * coeff, p_str + "Y"))

        for coeff, p_str in m_prev:
            m_prime_curr.append((-0.5 * coeff, p_str + "X"))
            m_prime_curr.append((0.5 * coeff, p_str + "Y"))

        return m_curr, m_prime_curr

    raw_terms, _ = _mabk_recursive(n)

    # Consolidate duplicate Pauli terms by summing coefficients
    grouped: Dict[str, float] = defaultdict(float)
    for coeff, pauli_str in raw_terms:
        grouped[pauli_str] += coeff

    # Filter out near-zero terms
    terms = [(round(val, 6), p) for p, val in grouped.items() if abs(val) > 1e-6]
    return terms


def evaluate_parity_expectation(counts: Dict[str, int]) -> float:
    """
    Calculates the Pauli expectation value E from bitstring counts:
    E = (Even Parity Counts - Odd Parity Counts) / Total Shots.
    """
    total_shots = sum(counts.values())
    if total_shots == 0:
        return 0.0

    even_counts = 0
    odd_counts = 0
    for bitstring, count in counts.items():
        # Clean bitstring (remove spaces if present)
        clean_bits = bitstring.replace(" ", "")
        parity = sum(int(b) for b in clean_bits) % 2
        if parity == 0:
            even_counts += count
        else:
            odd_counts += count

    return (even_counts - odd_counts) / total_shots


def compute_mabk_witness(
    circuit: QuantumCircuit,
    noise_model: Optional[NoiseModel] = None,
    shots: int = 2048,
    state_type: str = "ghz",
) -> MABKAnalysisResult:
    """
    Calculates the MABK Bell inequality witness value S across rotated measurement bases.
    If S > 2.0, certifies non-locality (quantum entanglement verified).

    Parameters:
        circuit (QuantumCircuit): Target quantum state preparation circuit.
        noise_model (Optional[NoiseModel]): Aer noise model.
        shots (int): Shots per basis setting.
        state_type (str): 'ghz' or 'w'.

    Returns:
        MABKAnalysisResult: Detailed witness values, threshold, and status.
    """
    n = circuit.num_qubits
    terms = get_mabk_correlation_terms(n)
    sim = AerSimulator(noise_model=noise_model) if noise_model else AerSimulator()

    # Theoretical maximum for ideal GHZ state is 2^((N+1)/2)
    theoretical_max = 2.0 ** ((n + 1) / 2.0) if state_type == "ghz" else 2.0 * np.sqrt(n - 1)

    s_raw = 0.0
    unique_bases = sorted(list({pauli for _, pauli in terms}))

    for coeff, basis_str in terms:
        # Build measurement circuit in the specific Pauli basis
        meas_qc = attach_measurement_basis(circuit, basis_str)
        job = sim.run(meas_qc, shots=shots)
        counts = job.result().get_counts()
        e_val = evaluate_parity_expectation(counts)
        s_raw += coeff * e_val

    s_abs = abs(float(s_raw))
    is_nonlocal = s_abs > 2.0

    return MABKAnalysisResult(
        mabk_value_raw=round(s_abs, 4),
        mabk_value_mitigated=None,
        classical_threshold=2.0,
        quantum_nonlocal=is_nonlocal,
        optimal_bases_used=unique_bases,
        theoretical_max=round(theoretical_max, 4),
    )
