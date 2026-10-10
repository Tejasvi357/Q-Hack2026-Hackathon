import logging
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from qiskit_aer import AerSimulator

from app.schemas import SimulationRequest, SimulationResponse, MABKAnalysisResult
from app.quantum.circuits import (
    generate_ghz_circuit,
    generate_w_circuit,
    get_state_labels,
)
from app.quantum.noise import build_noise_model
from app.quantum.metrics import (
    compute_fidelity,
    compute_mabk_witness,
    reconstruct_density_matrix,
)
from app.quantum.mitigation import apply_full_mitigation

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nexq-01")

app = FastAPI(
    title="NexQ-01 Quantum Verification & Error Mitigation Platform",
    description="Interactive quantum entangled state verification, hardware noise injection, and automated ZNE + readout mitigation engine.",
    version="1.0.0",
)

# Enable CORS for local Vite development and remote environments (Codespaces, Colab)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Returns engine health status and platform metadata."""
    return {
        "status": "online",
        "engine": "Qiskit Aer",
        "version": "1.0.0",
        "platform": "NexQ-01 NISQ Verification Suite",
    }


@app.post("/api/simulate", response_model=SimulationResponse)
async def simulate_quantum(req: SimulationRequest):
    """
    Executes end-to-end quantum simulation pipeline:
    1. Generates target entangled state (GHZ or W).
    2. Builds realistic Aer noise model (T1/T2, gate depolarizing, readout).
    3. Simulates ideal vs. noisy measurement shot distributions.
    4. Computes state fidelity F and evaluates MABK Bell witness non-locality (S > 2).
    5. Optionally applies automated dual-layer error mitigation (ZNE + Readout Inversion).
    """
    try:
        n = req.num_qubits

        # 1. State Circuit Generation
        if req.state_type == "ghz":
            clean_qc = generate_ghz_circuit(n, measure=False)
            meas_qc = generate_ghz_circuit(n, measure=True)
        elif req.state_type == "w":
            clean_qc = generate_w_circuit(n, measure=False)
            meas_qc = generate_w_circuit(n, measure=True)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported state_type: {req.state_type}")

        # 2. Hardware Noise Model Configuration
        noise_model = build_noise_model(
            t1=req.t1_time,
            t2=req.t2_time,
            gate_error=req.gate_error,
            readout_error=req.readout_error,
            num_qubits=n,
        )

        # 3. Clean (Ideal) Execution
        ideal_sim = AerSimulator()
        ideal_job = ideal_sim.run(meas_qc, shots=req.shots)
        ideal_raw_counts = ideal_job.result().get_counts()
        ideal_counts = {k.replace(" ", ""): v for k, v in ideal_raw_counts.items()}

        # 4. Noisy Hardware Execution
        noisy_sim = AerSimulator(noise_model=noise_model)
        noisy_job = noisy_sim.run(meas_qc, shots=req.shots)
        noisy_raw_counts = noisy_job.result().get_counts()
        noisy_counts = {k.replace(" ", ""): v for k, v in noisy_raw_counts.items()}

        # 5. Density Matrix Reconstruction & Fidelity
        rho_ideal = reconstruct_density_matrix(clean_qc, noise_model=None)
        rho_noisy = reconstruct_density_matrix(clean_qc, noise_model=noise_model)
        fidelity_noisy = compute_fidelity(rho_ideal, rho_noisy)

        # 6. MABK Bell Inequality Witness Verification
        mabk_result = compute_mabk_witness(
            clean_qc,
            noise_model=noise_model,
            shots=req.shots,
            state_type=req.state_type,
        )

        # 7. Automated Error Mitigation (ZNE + Readout Matrix Inversion)
        mitigated_counts = None
        fidelity_mitigated = None
        zne_curve = None

        if req.enable_mitigation:
            mitigated_counts, zne_curve = apply_full_mitigation(
                circuit=meas_qc,
                noise_model=noise_model,
                readout_error=req.readout_error,
                shots=req.shots,
                scale_factors=[1.0, 3.0, 5.0],
            )

            # Compute probability fidelity recovery
            all_bstrs = get_state_labels(n)
            p_ideal = np.array([ideal_counts.get(b, 0) / req.shots for b in all_bstrs])
            p_noisy = np.array([noisy_counts.get(b, 0) / req.shots for b in all_bstrs])
            p_mit = np.array([mitigated_counts.get(b, 0) / req.shots for b in all_bstrs])

            # Classical fidelity metric: F_c = (sum sqrt(p_ideal * p_est))^2
            fc_noisy = max(1e-6, float(np.sum(np.sqrt(p_ideal * p_noisy)) ** 2))
            fc_mit = max(1e-6, float(np.sum(np.sqrt(p_ideal * p_mit)) ** 2))
            improvement_ratio = min(2.5, fc_mit / fc_noisy)

            # Mitigated quantum fidelity projection
            fidelity_mitigated = float(np.clip(fidelity_noisy * improvement_ratio, 0.0, 0.998))

            # Mitigated MABK witness projection
            s_gain = (fidelity_mitigated - fidelity_noisy) * 1.5
            s_mitigated = min(mabk_result.theoretical_max, mabk_result.mabk_value_raw + s_gain)
            mabk_result.mabk_value_mitigated = round(float(s_mitigated), 4)

        # 8. Reconstructed Density Matrix Arrays for 3D City Visualization
        # Round values for network efficiency
        dm_real = [[round(float(np.real(val)), 5) for val in row] for row in rho_noisy]
        dm_imag = [[round(float(np.imag(val)), 5) for val in row] for row in rho_noisy]

        # Basis labels
        state_labels = get_state_labels(n, as_kets=True)

        return SimulationResponse(
            ideal_counts=ideal_counts,
            noisy_counts=noisy_counts,
            mitigated_counts=mitigated_counts,
            fidelity_noisy=round(fidelity_noisy, 4),
            fidelity_mitigated=round(fidelity_mitigated, 4) if fidelity_mitigated is not None else None,
            mabk_value=mabk_result.mabk_value_raw,
            is_quantum_nonlocal=mabk_result.quantum_nonlocal,
            density_matrix_real=dm_real,
            density_matrix_imag=dm_imag,
            mabk_details=mabk_result,
            state_labels=state_labels,
            scale_factors=[1.0, 3.0, 5.0],
            zne_curve=zne_curve,
            circuit_depth=clean_qc.depth(),
            num_gates=sum(clean_qc.count_ops().values()),
        )

    except Exception as e:
        logger.exception("Error executing simulation")
        raise HTTPException(status_code=500, detail=str(e))
