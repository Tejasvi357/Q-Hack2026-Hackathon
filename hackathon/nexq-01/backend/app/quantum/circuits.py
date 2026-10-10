import numpy as np
from qiskit import QuantumCircuit


def generate_ghz_circuit(n: int, measure: bool = False) -> QuantumCircuit:
    """
    Constructs an N-qubit Greenberger-Horne-Zeilinger (GHZ) state circuit:
    |GHZ_N> = (|0...0> + |1...1>) / sqrt(2).

    Parameters:
        n (int): Number of qubits (3 <= n <= 8).
        measure (bool): If True, appends full measurement register.

    Returns:
        QuantumCircuit: Prepared GHZ quantum circuit.
    """
    if n < 3 or n > 8:
        raise ValueError(f"num_qubits must be between 3 and 8, got {n}")

    qc = QuantumCircuit(n, name=f"GHZ_{n}")

    # Hadamard gate on first qubit to create superposition (|0> + |1>) / sqrt(2)
    qc.h(0)

    # Entangle all subsequent qubits via cascade of CX gates
    for i in range(n - 1):
        qc.cx(i, i + 1)

    if measure:
        qc.measure_all()

    return qc


def generate_w_circuit(n: int, measure: bool = False) -> QuantumCircuit:
    """
    Constructs an N-qubit W-state circuit using deterministic controlled-rotations:
    |W_N> = (|10...0> + |01...0> + ... + |00...1>) / sqrt(N).

    The induction uses an excitation on qubit 0 split across qubits 1 through N-1:
    theta_i = 2 * arccos(sqrt(1 / (N - i))) for i = 0 to N - 2.

    Parameters:
        n (int): Number of qubits (3 <= n <= 8).
        measure (bool): If True, appends full measurement register.

    Returns:
        QuantumCircuit: Prepared W-state quantum circuit.
    """
    if n < 3 or n > 8:
        raise ValueError(f"num_qubits must be between 3 and 8, got {n}")

    qc = QuantumCircuit(n, name=f"W_{n}")

    # Place initial single excitation on qubit 0
    qc.x(0)

    # Inductively split excitation among remaining qubits
    for i in range(n - 1):
        remaining = n - i
        # Exact rotation angle to allocate 1/sqrt(N) amplitude to qubit i
        cos_val = np.sqrt(1.0 / remaining)
        theta = 2.0 * np.arccos(cos_val)

        # Transfer fraction of excitation to qubit i + 1
        qc.cry(theta, i, i + 1)
        # Untangle excitation so qubit i holds |1> only when qubit i+1 is |0>
        qc.cx(i + 1, i)

    if measure:
        qc.measure_all()

    return qc


def get_state_labels(n: int, as_kets: bool = False) -> list[str]:
    """
    Generates computational basis state labels for N qubits.

    Parameters:
        n (int): Number of qubits.
        as_kets (bool): If True, formats as '|001>', else '001'.

    Returns:
        list[str]: 2^N state labels in ascending integer order.
    """
    total_states = 1 << n
    if as_kets:
        return [f"|{format(i, f'0{n}b')}>" for i in range(total_states)]
    return [format(i, f'0{n}b') for i in range(total_states)]
