"""
Quantum engine modules for NexQ-01:
- circuits: Entangled state generators (GHZ, W)
- noise: Configurable Aer noise models (T1, T2, gate, readout)
- metrics: Quantum state fidelity, MABK Bell witness, density matrix tomography
- mitigation: Zero-Noise Extrapolation (ZNE) and Readout Matrix Inversion
"""

from .circuits import generate_ghz_circuit, generate_w_circuit, get_state_labels
from .noise import build_noise_model
from .metrics import (
    compute_fidelity,
    compute_mabk_witness,
    reconstruct_density_matrix,
    attach_measurement_basis,
    get_mabk_correlation_terms,
)
from .mitigation import apply_zne, apply_readout_inversion, apply_full_mitigation

__all__ = [
    "generate_ghz_circuit",
    "generate_w_circuit",
    "get_state_labels",
    "build_noise_model",
    "compute_fidelity",
    "compute_mabk_witness",
    "reconstruct_density_matrix",
    "attach_measurement_basis",
    "get_mabk_correlation_terms",
    "apply_zne",
    "apply_readout_inversion",
    "apply_full_mitigation",
]
