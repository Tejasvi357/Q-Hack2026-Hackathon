import numpy as np
from typing import Dict, List, Tuple, Optional
from scipy.optimize import lsq_linear
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel

from app.quantum.circuits import get_state_labels


def fold_cnot_gates(circuit: QuantumCircuit, scale_factor: float) -> QuantumCircuit:
    """
    Applies digital unitary folding to scale gate noise:
    For scale factor lambda = 2k + 1 (e.g. 1, 3, 5), each CX gate is replaced
    by (2k + 1) consecutive CX gates. Since CX * CX = I, the logical unitary
    is preserved while physical gate noise scales proportionally by lambda.

    Avoids CircuitError by reconstructing quantum operations without legacy classical bits,
    then applying a clean measurement register.
    """
    k = int(round(scale_factor))
    if k <= 1:
        k = 1
    elif k % 2 == 0:
        k += 1

    # Rebuild circuit with folded CX gates on quantum registers only
    qc_folded = QuantumCircuit(circuit.num_qubits, name=f"Folded_{k}x")
    for instruction in circuit.data:
        op = instruction.operation
        # Skip legacy measurements and barriers during folding
        if op.name in ["measure", "barrier"]:
            continue

        # Map qubit indices safely within the new circuit
        q_indices = [circuit.qubits.index(q) for q in instruction.qubits]
        target_qubits = [qc_folded.qubits[idx] for idx in q_indices]

        if op.name in ["cx", "cz"]:
            for _ in range(k):
                qc_folded.append(op, target_qubits)
        else:
            qc_folded.append(op, target_qubits)

    # Re-apply fresh measurement register
    qc_folded.measure_all()
    return qc_folded


def compute_richardson_weights(scale_factors: List[float]) -> np.ndarray:
    """
    Computes Richardson polynomial extrapolation weights w_i such that
    sum(w_i) = 1 and sum(w_i * lambda_i^p) = 0 for p = 1, ..., n-1.

    Formula: w_i = prod_{j != i} [ -lambda_j / (lambda_i - lambda_j) ]
    """
    n = len(scale_factors)
    weights = np.zeros(n)
    for i in range(n):
        prod = 1.0
        for j in range(n):
            if i != j:
                prod *= (-scale_factors[j]) / (scale_factors[i] - scale_factors[j])
        weights[i] = prod
    return weights


def apply_zne(
    circuit: QuantumCircuit,
    noise_model: NoiseModel,
    scale_factors: List[float] = [1.0, 3.0, 5.0],
    shots: int = 2048,
) -> Tuple[Dict[str, int], Dict[str, List[float]]]:
    """
    Applies Zero-Noise Extrapolation (ZNE) using pulse/gate folding
    and Richardson polynomial extrapolation back to the zero-noise limit (0x).
    """
    sim = AerSimulator(noise_model=noise_model)
    n = circuit.num_qubits
    all_states = get_state_labels(n)

    # Collect probability distributions at each noise scale factor
    probs_by_scale: List[np.ndarray] = []

    for scale in scale_factors:
        folded_qc = fold_cnot_gates(circuit, scale)
        job = sim.run(folded_qc, shots=shots)
        counts = job.result().get_counts()

        p_vec = np.zeros(1 << n)
        for bitstring, c in counts.items():
            clean_bits = bitstring.replace(" ", "")
            try:
                idx = int(clean_bits, 2)
                p_vec[idx] = c / shots
            except ValueError:
                pass
        probs_by_scale.append(p_vec)

    # Richardson extrapolation weights
    weights = compute_richardson_weights(scale_factors)

    # Extrapolate to lambda = 0
    extrapolated_probs = np.zeros(1 << n)
    for w, p_vec in zip(weights, probs_by_scale):
        extrapolated_probs += w * p_vec

    # Physical projection: probabilities must be non-negative and sum to 1
    extrapolated_probs = np.clip(extrapolated_probs, 0.0, None)
    prob_sum = np.sum(extrapolated_probs)
    if prob_sum > 0:
        extrapolated_probs /= prob_sum
    else:
        extrapolated_probs = probs_by_scale[0]  # Fallback to scale 1.0

    # Convert probabilities to integer counts matching total shots
    mitigated_counts: Dict[str, int] = {}
    for idx, p in enumerate(extrapolated_probs):
        c = int(round(p * shots))
        if c > 0:
            bitstring = all_states[idx]
            mitigated_counts[bitstring] = c

    # Extract ZNE trajectory curves for top dominant states
    top_indices = np.argsort(extrapolated_probs)[-4:][::-1]
    zne_curve: Dict[str, List[float]] = {
        "scale_factors": [0.0] + list(scale_factors)
    }
    for idx in top_indices:
        bstr = all_states[idx]
        pts = [float(extrapolated_probs[idx])] + [float(probs_by_scale[s_idx][idx]) for s_idx in range(len(scale_factors))]
        zne_curve[bstr] = pts

    return mitigated_counts, zne_curve


def apply_readout_inversion(
    counts: Dict[str, int],
    n: int,
    readout_error: float,
    shots: int = 2048,
) -> Dict[str, int]:
    """
    Inverts the classical measurement assignment calibration matrix M:
    M * p_ideal = p_noisy.
    """
    if readout_error <= 1e-5:
        return counts

    dim = 1 << n
    all_states = get_state_labels(n)

    # Construct single-qubit calibration matrix M1
    e = readout_error
    m1 = np.array([[1.0 - e, e], [e, 1.0 - e]])

    # Construct full 2^N x 2^N calibration matrix M = M1 (x) M1 (x) ... (x) M1
    m_full = m1
    for _ in range(n - 1):
        m_full = np.kron(m_full, m1)

    # Construct noisy probability vector
    p_noisy = np.zeros(dim)
    for bitstring, c in counts.items():
        clean_bits = bitstring.replace(" ", "")
        try:
            idx = int(clean_bits, 2)
            p_noisy[idx] = c / shots
        except ValueError:
            pass

    # Solve M * p_ideal = p_noisy with bounds 0 <= p_ideal <= 1
    res = lsq_linear(m_full, p_noisy, bounds=(0.0, 1.0), max_iter=200)
    p_mitigated = res.x

    # Normalize
    s = np.sum(p_mitigated)
    if s > 0:
        p_mitigated /= s

    # Convert back to counts
    mitigated_counts: Dict[str, int] = {}
    for idx, p in enumerate(p_mitigated):
        c = int(round(p * shots))
        if c > 0:
            bitstring = all_states[idx]
            mitigated_counts[bitstring] = c

    return mitigated_counts


def apply_full_mitigation(
    circuit: QuantumCircuit,
    noise_model: NoiseModel,
    readout_error: float,
    shots: int = 2048,
    scale_factors: List[float] = [1.0, 3.0, 5.0],
) -> Tuple[Dict[str, int], Dict[str, List[float]]]:
    """
    Executes the dual-layer automated mitigation pipeline:
    Layer 1: Pulse/Gate Zero-Noise Extrapolation (ZNE) with Richardson extrapolation.
    Layer 2: Readout Assignment Matrix Inversion calibration.
    """
    zne_counts, zne_curve = apply_zne(circuit, noise_model, scale_factors, shots)
    fully_mitigated_counts = apply_readout_inversion(
        zne_counts, circuit.num_qubits, readout_error, shots
    )
    return fully_mitigated_counts, zne_curve
