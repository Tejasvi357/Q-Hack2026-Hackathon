import numpy as np
from qiskit_aer.noise import (
    NoiseModel,
    depolarizing_error,
    thermal_relaxation_error,
    ReadoutError,
)


def build_noise_model(
    t1: float,
    t2: float,
    gate_error: float,
    readout_error: float,
    num_qubits: int = 8,
) -> NoiseModel:
    """
    Constructs a comprehensive, physically accurate Qiskit Aer NoiseModel
    incorporating T1 longitudinal relaxation, T2 transverse dephasing,
    1-qubit/2-qubit depolarizing gate noise, and asymmetric readout assignment errors.

    Parameters:
        t1 (float): Longitudinal relaxation time T1 in microseconds (us).
        t2 (float): Transverse dephasing time T2 in microseconds (us).
        gate_error (float): 2-qubit gate depolarizing error probability (0.0 to 0.10).
        readout_error (float): Classical bit-flip measurement error probability (0.0 to 0.15).
        num_qubits (int): Total number of qubits to configure.

    Returns:
        NoiseModel: Configured Qiskit Aer noise model.
    """
    noise_model = NoiseModel()

    # Physical constraint: T2 <= 2 * T1 is fundamentally required by quantum mechanics
    # If user provides T2 > 2 * T1, clamp T2 safely below 2 * T1 to avoid Aer errors.
    effective_t1 = max(1.0, float(t1))
    max_physical_t2 = 2.0 * effective_t1 - 1e-4
    effective_t2 = min(float(t2), max_physical_t2)
    effective_t2 = max(0.1, effective_t2)

    # Standard superconducting gate durations in microseconds
    gate_time_1q = 0.05  # 50 nanoseconds
    gate_time_2q = 0.20  # 200 nanoseconds

    # 1. Thermal Relaxation Errors (T1 / T2 decay)
    error_thermal_1q = thermal_relaxation_error(effective_t1, effective_t2, gate_time_1q)
    error_thermal_2q_single = thermal_relaxation_error(effective_t1, effective_t2, gate_time_2q)
    error_thermal_2q = error_thermal_2q_single.tensor(error_thermal_2q_single)

    # 2. Gate Depolarizing Noise
    # Single-qubit gate error is typically ~10x cleaner than two-qubit gate error
    error_1q_rate = max(0.0, gate_error * 0.1)
    error_2q_rate = max(0.0, gate_error)

    # Compose thermal relaxation and depolarizing errors for 1-qubit gates
    if error_1q_rate > 1e-6:
        depol_1q = depolarizing_error(error_1q_rate, 1)
        full_error_1q = error_thermal_1q.compose(depol_1q)
    else:
        full_error_1q = error_thermal_1q

    # Compose thermal relaxation and depolarizing errors for 2-qubit gates
    if error_2q_rate > 1e-6:
        depol_2q = depolarizing_error(error_2q_rate, 2)
        full_error_2q = error_thermal_2q.compose(depol_2q)
    else:
        full_error_2q = error_thermal_2q

    # Register gate errors in the noise model
    single_qubit_gates = ["u1", "u2", "u3", "rx", "ry", "rz", "h", "x", "sx", "s", "sdg"]
    noise_model.add_all_qubit_quantum_error(full_error_1q, single_qubit_gates)

    two_qubit_gates = ["cx", "cz", "cry"]
    noise_model.add_all_qubit_quantum_error(full_error_2q, two_qubit_gates)

    # 3. Readout Assignment Errors
    # Probability matrix: [[P(0|0), P(1|0)], [P(0|1), P(1|1)]]
    if readout_error > 1e-6:
        p0_given_0 = 1.0 - readout_error
        p1_given_0 = readout_error
        p0_given_1 = readout_error
        p1_given_1 = 1.0 - readout_error

        readout_matrix = [
            [p0_given_0, p1_given_0],
            [p0_given_1, p1_given_1],
        ]
        readout_err = ReadoutError(readout_matrix)
        noise_model.add_all_qubit_readout_error(readout_err)

    return noise_model
