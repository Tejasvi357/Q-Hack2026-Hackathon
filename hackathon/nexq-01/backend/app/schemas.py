from typing import Dict, List, Optional, Literal
from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    """Parameters for quantum entangled state simulation and mitigation."""
    num_qubits: int = Field(
        default=3,
        ge=3,
        le=8,
        description="Number of qubits for entangled state simulation (3 to 8)"
    )
    state_type: Literal["ghz", "w"] = Field(
        default="ghz",
        description="Quantum entangled state type: 'ghz' or 'w'"
    )
    t1_time: float = Field(
        default=50.0,
        ge=10.0,
        le=200.0,
        description="T1 longitudinal relaxation time in microseconds (10 to 200 us)"
    )
    t2_time: float = Field(
        default=30.0,
        ge=5.0,
        le=150.0,
        description="T2 transverse dephasing time in microseconds (5 to 150 us)"
    )
    gate_error: float = Field(
        default=0.01,
        ge=0.0,
        le=0.10,
        description="2-qubit gate error rate for CX depolarizing channel (0.0 to 0.10)"
    )
    readout_error: float = Field(
        default=0.03,
        ge=0.0,
        le=0.15,
        description="Readout bit-flip assignment error rate (0.0 to 0.15)"
    )
    enable_mitigation: bool = Field(
        default=True,
        description="Whether to apply automated ZNE + Readout Matrix Inversion"
    )
    shots: int = Field(
        default=2048,
        ge=256,
        le=8192,
        description="Number of measurement shots per circuit execution"
    )


class MABKAnalysisResult(BaseModel):
    """Detailed MABK Bell inequality witness evaluation."""
    mabk_value_raw: float = Field(
        description="Measured MABK expectation value under hardware noise"
    )
    mabk_value_mitigated: Optional[float] = Field(
        default=None,
        description="MABK expectation value after zero-noise and readout mitigation"
    )
    classical_threshold: float = Field(
        default=2.0,
        description="Local Hidden Variable (LHV) classical upper bound S <= 2.0"
    )
    quantum_nonlocal: bool = Field(
        description="True if measured S exceeds the classical threshold 2.0"
    )
    optimal_bases_used: List[str] = Field(
        default_factory=list,
        description="Measurement bases sampled (e.g. ['XXX', 'XYY', 'YXY', 'YYX'])"
    )
    theoretical_max: float = Field(
        description="Theoretical quantum maximum violation for the ideal state"
    )


class SimulationResponse(BaseModel):
    """Output results of quantum simulation, verification, and mitigation."""
    ideal_counts: Dict[str, int] = Field(
        description="Clean ideal shot distribution"
    )
    noisy_counts: Dict[str, int] = Field(
        description="Noisy hardware simulation shot distribution"
    )
    mitigated_counts: Optional[Dict[str, int]] = Field(
        default=None,
        description="Mitigated shot distribution after ZNE and Readout Inversion"
    )
    fidelity_noisy: float = Field(
        description="Quantum state fidelity of the noisy state relative to ideal"
    )
    fidelity_mitigated: Optional[float] = Field(
        default=None,
        description="Quantum state fidelity after error mitigation"
    )
    mabk_value: float = Field(
        description="Primary MABK Bell witness value S"
    )
    is_quantum_nonlocal: bool = Field(
        description="True if non-locality is witnessed (S > 2.0)"
    )
    density_matrix_real: List[List[float]] = Field(
        description="Real components of reconstructed density matrix Re(rho)"
    )
    density_matrix_imag: List[List[float]] = Field(
        description="Imaginary components of reconstructed density matrix Im(rho)"
    )
    mabk_details: Optional[MABKAnalysisResult] = Field(
        default=None,
        description="Extended MABK Bell inequality analysis result"
    )
    state_labels: List[str] = Field(
        description="Basis state labels (|000>, |001>, etc.)"
    )
    scale_factors: List[float] = Field(
        default=[1.0, 3.0, 5.0],
        description="Noise scale factors used in Zero-Noise Extrapolation"
    )
    zne_curve: Optional[Dict[str, List[float]]] = Field(
        default=None,
        description="Extrapolation data points [lambda_values, raw_probabilities, fit_intercept]"
    )
    circuit_depth: int = Field(
        default=0,
        description="Depth of the target quantum circuit"
    )
    num_gates: int = Field(
        default=0,
        description="Total gate count in the quantum circuit"
    )
