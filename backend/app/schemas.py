"""
Pydantic request/response schemas for the Pertamina Offshore
Drilling Engineering API.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


# ---------------------------------------------------------------------------
# Generic calculator envelope
# ---------------------------------------------------------------------------

class FormulaRequest(BaseModel):
    formula_id: str = Field(..., description="Unique id of the formula to run")
    inputs: dict = Field(..., description="Key/value map of numeric inputs")


class FormulaResult(BaseModel):
    formula_id: str
    label: str
    result: float
    unit: str


# ---------------------------------------------------------------------------
# Unit conversion
# ---------------------------------------------------------------------------

class ConversionRequest(BaseModel):
    category: str        # temperature | pressure | density | length | volume | flow_rate
    from_unit: str
    to_unit: str
    value: float


class ConversionResult(BaseModel):
    value: float
    from_unit: str
    to_unit: str
    category: str


# ---------------------------------------------------------------------------
# Well Control Kill Sheet
# ---------------------------------------------------------------------------

class KillSheetRequest(BaseModel):
    current_mud_weight_ppg: float
    true_vertical_depth_ft: float
    measured_depth_ft: float
    sidpp_psi: float = Field(..., description="Shut-In Drill Pipe Pressure")
    sicp_psi: float = Field(..., description="Shut-In Casing Pressure")
    slow_pump_rate_pressure_psi: float
    slow_pump_rate_spm: float
    drill_string_capacity_bbl_per_ft: float
    annular_capacity_bbl_per_ft: float
    pump_output_bbl_per_stroke: float
    frac_gradient_ppg: Optional[float] = None
    casing_shoe_tvd_ft: Optional[float] = None


class KillSheetResult(BaseModel):
    kill_mud_weight_ppg: float
    initial_circulating_pressure_psi: float
    final_circulating_pressure_psi: float
    strokes_to_bit: float
    strokes_to_surface: float
    total_strokes_bottoms_up: float
    time_to_bit_min: float
    time_to_surface_min: float
    maasp_psi: Optional[float] = None
    formation_pressure_psi: float
    pressure_step_table: List[dict]


# ---------------------------------------------------------------------------
# Wellbore Geometry
# ---------------------------------------------------------------------------

class HoleSection(BaseModel):
    name: str
    top_md_ft: float
    bottom_md_ft: float
    hole_or_casing_id_in: float
    pipe_od_in: float
    is_cased: bool = False


class WellboreGeometryRequest(BaseModel):
    sections: List[HoleSection]
    inclination_deg: float = 0.0  # simplified single average inclination


class SectionVolumeResult(BaseModel):
    name: str
    length_ft: float
    capacity_bbl_per_ft: float
    annular_volume_bbl: float
    displacement_bbl_per_ft: float
    tvd_ft: float


class WellboreGeometryResult(BaseModel):
    sections: List[SectionVolumeResult]
    total_annular_volume_bbl: float
    total_measured_depth_ft: float
    total_true_vertical_depth_ft: float
