"""
Pertamina Offshore Drilling Engineering API
FastAPI application exposing:
  - Generic drilling calculator (formula registry)
  - Petroleum unit conversion
  - Well Control Kill Sheet (IADC style)
  - Wellbore geometry / capacity calculations
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import formulas as f
from app.schemas import (
    FormulaRequest, FormulaResult,
    ConversionRequest, ConversionResult,
    KillSheetRequest, KillSheetResult,
    WellboreGeometryRequest, WellboreGeometryResult, SectionVolumeResult,
)

app = FastAPI(
    title="Pertamina Offshore Drilling Engineering API",
    description="Drilling Calculator, Unit Conversion, Well Control Kill Sheet, Wellbore Geometry",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "pertamina-drilling-api"}


# ---------------------------------------------------------------------------
# 1) DRILLING CALCULATOR
# ---------------------------------------------------------------------------

@app.get("/calculator/formulas")
def list_formulas():
    """Returns metadata for every registered formula, grouped by category."""
    grouped: dict = {}
    for fid, meta in f.FORMULA_REGISTRY.items():
        category = meta["category"]
        grouped.setdefault(category, [])
        params = [p for p in meta["fn"].__code__.co_varnames[: meta["fn"].__code__.co_argcount]]
        grouped[category].append({
            "formula_id": fid,
            "label": meta["label"],
            "unit": meta["unit"],
            "inputs": params,
        })
    return grouped


@app.post("/calculator/run", response_model=FormulaResult)
def run_formula(payload: FormulaRequest):
    meta = f.FORMULA_REGISTRY.get(payload.formula_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Formula '{payload.formula_id}' not found")
    fn = meta["fn"]
    try:
        result = fn(**payload.inputs)
    except TypeError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid inputs: {exc}")
    except ZeroDivisionError:
        raise HTTPException(status_code=422, detail="Division by zero in formula inputs")
    return FormulaResult(
        formula_id=payload.formula_id,
        label=meta["label"],
        result=round(float(result), 6),
        unit=meta["unit"],
    )


# ---------------------------------------------------------------------------
# 2) UNIT CONVERSION
# ---------------------------------------------------------------------------

def _convert_temperature(value: float, from_unit: str, to_unit: str) -> float:
    to_c = {"C": lambda v: v, "F": lambda v: (v - 32) * 5 / 9, "K": lambda v: v - 273.15}
    from_c = {"C": lambda v: v, "F": lambda v: v * 9 / 5 + 32, "K": lambda v: v + 273.15}
    return from_c[to_unit](to_c[from_unit](value))


CONVERSION_TABLES = {
    "pressure": {"psi": 1.0, "bar": 14.5038, "kPa": 0.145038, "atm": 14.6959},
    "density": {"ppg": 1.0, "sg": 8.34540, "kg_m3": 0.00834540, "lb_ft3": 0.133681},
    "length": {"m": 3.28084, "ft": 1.0, "in": 1 / 12},
    "volume": {"bbl": 1.0, "m3": 0.158987, "gal_us": 42.0, "L": 6.28981},
    "flow_rate": {"gpm": 1.0, "bpm": 42.0, "L_min": 0.264172, "m3_min": 264.172},
}


@app.post("/conversion/run", response_model=ConversionResult)
def run_conversion(payload: ConversionRequest):
    if payload.category == "temperature":
        try:
            result = _convert_temperature(payload.value, payload.from_unit, payload.to_unit)
        except KeyError:
            raise HTTPException(status_code=422, detail="Invalid temperature unit")
        return ConversionResult(value=round(result, 4), from_unit=payload.from_unit,
                                 to_unit=payload.to_unit, category=payload.category)

    table = CONVERSION_TABLES.get(payload.category)
    if not table:
        raise HTTPException(status_code=404, detail=f"Unknown category '{payload.category}'")
    if payload.from_unit not in table or payload.to_unit not in table:
        raise HTTPException(status_code=422, detail="Invalid unit for this category")

    base_value = payload.value / table[payload.from_unit]
    result = base_value * table[payload.to_unit]
    return ConversionResult(value=round(result, 6), from_unit=payload.from_unit,
                             to_unit=payload.to_unit, category=payload.category)


# ---------------------------------------------------------------------------
# 3) WELL CONTROL KILL SHEET
# ---------------------------------------------------------------------------

@app.post("/killsheet/calculate", response_model=KillSheetResult)
def calculate_kill_sheet(payload: KillSheetRequest):
    kmw = f.kill_mud_weight(payload.current_mud_weight_ppg, payload.sidpp_psi, payload.true_vertical_depth_ft)
    icp = f.initial_circulating_pressure(payload.sidpp_psi, payload.slow_pump_rate_pressure_psi)
    fcp = f.final_circulating_pressure(payload.slow_pump_rate_pressure_psi, kmw, payload.current_mud_weight_ppg)
    formation_p = f.formation_pressure(payload.current_mud_weight_ppg, payload.true_vertical_depth_ft,
                                        payload.sidpp_psi)

    drill_string_volume = payload.drill_string_capacity_bbl_per_ft * payload.measured_depth_ft
    annular_volume = payload.annular_capacity_bbl_per_ft * payload.measured_depth_ft

    strokes_to_bit = drill_string_volume / payload.pump_output_bbl_per_stroke
    strokes_to_surface = annular_volume / payload.pump_output_bbl_per_stroke
    total_strokes = strokes_to_bit + strokes_to_surface

    time_to_bit = strokes_to_bit / payload.slow_pump_rate_spm
    time_to_surface = strokes_to_surface / payload.slow_pump_rate_spm

    maasp_value = None
    if payload.frac_gradient_ppg and payload.casing_shoe_tvd_ft:
        maasp_value = f.maasp(payload.frac_gradient_ppg, payload.current_mud_weight_ppg,
                               payload.casing_shoe_tvd_ft)

    # Build a 10-step pressure schedule (ICP -> FCP) as pipe is displaced to bit
    steps = []
    n_steps = 10
    for i in range(n_steps + 1):
        stroke_count = round((strokes_to_bit / n_steps) * i)
        pressure = f.pressure_at_stroke(icp, fcp, stroke_count, round(strokes_to_bit))
        steps.append({"stroke": stroke_count, "drill_pipe_pressure_psi": round(pressure, 1)})

    return KillSheetResult(
        kill_mud_weight_ppg=round(kmw, 3),
        initial_circulating_pressure_psi=round(icp, 1),
        final_circulating_pressure_psi=round(fcp, 1),
        strokes_to_bit=round(strokes_to_bit, 1),
        strokes_to_surface=round(strokes_to_surface, 1),
        total_strokes_bottoms_up=round(total_strokes, 1),
        time_to_bit_min=round(time_to_bit, 2),
        time_to_surface_min=round(time_to_surface, 2),
        maasp_psi=round(maasp_value, 1) if maasp_value is not None else None,
        formation_pressure_psi=round(formation_p, 1),
        pressure_step_table=steps,
    )


# ---------------------------------------------------------------------------
# 4) WELLBORE GEOMETRY
# ---------------------------------------------------------------------------

@app.post("/geometry/calculate", response_model=WellboreGeometryResult)
def calculate_geometry(payload: WellboreGeometryRequest):
    results = []
    total_annular_volume = 0.0
    total_md = 0.0
    total_tvd = 0.0

    for section in payload.sections:
        length = section.bottom_md_ft - section.top_md_ft
        if length <= 0:
            raise HTTPException(status_code=422, detail=f"Invalid section length for '{section.name}'")

        capacity = f.annular_capacity(section.hole_or_casing_id_in, section.pipe_od_in) \
            if section.pipe_od_in > 0 else f.pipe_capacity(section.hole_or_casing_id_in)
        annular_vol = capacity * length
        disp = f.displacement(section.pipe_od_in, section.pipe_od_in * 0.85) if section.pipe_od_in > 0 else 0.0
        tvd = f.true_vertical_depth(length, payload.inclination_deg)

        total_annular_volume += annular_vol
        total_md += length
        total_tvd += tvd

        results.append(SectionVolumeResult(
            name=section.name,
            length_ft=round(length, 2),
            capacity_bbl_per_ft=round(capacity, 6),
            annular_volume_bbl=round(annular_vol, 3),
            displacement_bbl_per_ft=round(disp, 6),
            tvd_ft=round(tvd, 2),
        ))

    return WellboreGeometryResult(
        sections=results,
        total_annular_volume_bbl=round(total_annular_volume, 2),
        total_measured_depth_ft=round(total_md, 2),
        total_true_vertical_depth_ft=round(total_tvd, 2),
    )
