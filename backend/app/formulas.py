"""
Core drilling-engineering formula engine.

Every function is a pure, unit-explicit calculation based on standard
oilfield formulas (API / IADC references). Functions are registered in
FORMULA_REGISTRY so the frontend calculator can list and execute them
generically.
"""

import math
from typing import Callable, Dict, Any


# ===========================================================================
# 1. HYDRAULICS
# ===========================================================================

def annular_velocity(flow_rate_gpm: float, hole_id_in: float, pipe_od_in: float) -> float:
    """AV (ft/min) = (24.51 * Q) / (Dh^2 - Dp^2)"""
    return (24.51 * flow_rate_gpm) / (hole_id_in ** 2 - pipe_od_in ** 2)


def bit_nozzle_velocity(flow_rate_gpm: float, total_nozzle_area_in2: float) -> float:
    """Vn (ft/s) = 0.32048 * Q / At"""
    return 0.32048 * flow_rate_gpm / total_nozzle_area_in2


def bit_pressure_loss(mud_weight_ppg: float, flow_rate_gpm: float, total_nozzle_area_in2: float) -> float:
    """Delta Pb (psi) = (MW * Q^2) / (12042 * At^2)"""
    return (mud_weight_ppg * flow_rate_gpm ** 2) / (12042 * total_nozzle_area_in2 ** 2)


def hydraulic_horsepower_bit(flow_rate_gpm: float, bit_pressure_drop_psi: float) -> float:
    """HHPb = (Q * dPb) / 1714"""
    return (flow_rate_gpm * bit_pressure_drop_psi) / 1714


def pump_output_triplex(liner_diameter_in: float, stroke_length_in: float, efficiency: float = 1.0) -> float:
    """Pump output (bbl/stroke) - Triplex single-acting pump"""
    return 0.000243 * liner_diameter_in ** 2 * stroke_length_in * efficiency


def pump_output_duplex(liner_diameter_in: float, rod_diameter_in: float, stroke_length_in: float,
                        efficiency: float = 1.0) -> float:
    """Pump output (bbl/stroke) - Duplex double-acting pump"""
    return 0.000324 * (2 * liner_diameter_in ** 2 - rod_diameter_in ** 2) * stroke_length_in * efficiency


def equivalent_circulating_density(mud_weight_ppg: float, annular_friction_pressure_psi: float,
                                    true_vertical_depth_ft: float) -> float:
    """ECD (ppg) = MW + (AFP / (0.052 * TVD))"""
    return mud_weight_ppg + (annular_friction_pressure_psi / (0.052 * true_vertical_depth_ft))


def reynolds_number(mud_weight_ppg: float, velocity_ft_s: float, diameter_in: float,
                     viscosity_cp: float) -> float:
    """NRe = (928 * rho * V * D) / mu"""
    return (928 * mud_weight_ppg * velocity_ft_s * diameter_in) / viscosity_cp


def critical_flow_rate(hole_id_in: float, pipe_od_in: float, mud_weight_ppg: float,
                        plastic_viscosity_cp: float, yield_point_lb_100ft2: float) -> float:
    """Critical flow rate (gpm) for laminar-to-turbulent transition (simplified Bingham model)"""
    return (
        (1.08 * plastic_viscosity_cp)
        + (1.08 * math.sqrt(plastic_viscosity_cp ** 2 + 12.34 * (hole_id_in - pipe_od_in) ** 2
                             * mud_weight_ppg * yield_point_lb_100ft2))
    ) * (hole_id_in - pipe_od_in) / mud_weight_ppg


def surge_pressure_pipe_movement(pipe_velocity_ft_min: float, mud_weight_ppg: float,
                                  clinging_constant: float = 0.45) -> float:
    """Simplified surge/swab pressure gradient contribution (psi/1000ft) approximation"""
    return clinging_constant * pipe_velocity_ft_min * mud_weight_ppg / 1000


# ===========================================================================
# 2. VOLUMETRICS / CAPACITY
# ===========================================================================

def pipe_capacity(id_in: float) -> float:
    """Capacity (bbl/ft) = ID^2 / 1029.4"""
    return id_in ** 2 / 1029.4


def annular_capacity(hole_id_in: float, pipe_od_in: float) -> float:
    """Annular capacity (bbl/ft) = (Dh^2 - Dp^2) / 1029.4"""
    return (hole_id_in ** 2 - pipe_od_in ** 2) / 1029.4


def displacement(od_in: float, id_in: float) -> float:
    """Steel displacement (bbl/ft) = (OD^2 - ID^2) / 1029.4"""
    return (od_in ** 2 - id_in ** 2) / 1029.4


def hole_volume(capacity_bbl_per_ft: float, length_ft: float) -> float:
    return capacity_bbl_per_ft * length_ft


def total_mud_system_volume(active_pits_bbl: float, hole_volume_bbl: float,
                             surface_line_volume_bbl: float) -> float:
    return active_pits_bbl + hole_volume_bbl + surface_line_volume_bbl


def slug_volume(dry_pipe_length_ft: float, pipe_capacity_bbl_ft: float, slug_weight_increase_ppg: float,
                 current_mud_weight_ppg: float) -> float:
    """Slug volume (bbl) needed for a given dry-pipe length"""
    return (dry_pipe_length_ft * pipe_capacity_bbl_ft * slug_weight_increase_ppg) / (
        (current_mud_weight_ppg + slug_weight_increase_ppg) - current_mud_weight_ppg + slug_weight_increase_ppg
    ) if slug_weight_increase_ppg else 0.0


def bottoms_up_strokes(drill_string_capacity_bbl: float, annular_volume_bbl: float,
                        pump_output_bbl_per_stroke: float) -> float:
    return (drill_string_capacity_bbl + annular_volume_bbl) / pump_output_bbl_per_stroke


# ===========================================================================
# 3. TORQUE, DRAG & STRING WEIGHTS
# ===========================================================================

def buoyancy_factor(mud_weight_ppg: float, steel_density_ppg: float = 65.5) -> float:
    """BF = 1 - (MW / 65.5)"""
    return 1 - (mud_weight_ppg / steel_density_ppg)


def buoyant_weight(air_weight_lb: float, buoyancy_factor_value: float) -> float:
    return air_weight_lb * buoyancy_factor_value


def makeup_torque(od_in: float, min_yield_strength_psi: float, torsional_factor: float = 0.6) -> float:
    """Simplified API-style makeup torque estimate (ft-lb)"""
    return (torsional_factor * od_in ** 3 * min_yield_strength_psi) / 1000


def drag_force_soft_string(buoyant_weight_lb: float, friction_factor: float, inclination_deg: float) -> float:
    """Simplified soft-string drag force (lb) for a straight/tangent section"""
    return buoyant_weight_lb * friction_factor * math.sin(math.radians(inclination_deg))


def hook_load(buoyant_string_weight_lb: float, drag_force_lb: float, direction: str = "pickup") -> float:
    """direction: 'pickup' adds drag, 'slackoff' subtracts drag"""
    return buoyant_string_weight_lb + drag_force_lb if direction == "pickup" else buoyant_string_weight_lb - drag_force_lb


def string_stretch(load_lb: float, length_ft: float, cross_section_area_in2: float,
                    youngs_modulus_psi: float = 30_000_000) -> float:
    """Elastic stretch (ft) = (F * L) / (A * E)"""
    return (load_lb * length_ft) / (cross_section_area_in2 * youngs_modulus_psi)


# ===========================================================================
# 4. WELL CONTROL
# ===========================================================================

def kill_mud_weight(current_mud_weight_ppg: float, sidpp_psi: float, true_vertical_depth_ft: float) -> float:
    """KMW (ppg) = OMW + (SIDPP / (0.052 * TVD))"""
    return current_mud_weight_ppg + (sidpp_psi / (0.052 * true_vertical_depth_ft))


def initial_circulating_pressure(sidpp_psi: float, slow_pump_rate_pressure_psi: float) -> float:
    """ICP = SIDPP + SPP"""
    return sidpp_psi + slow_pump_rate_pressure_psi


def final_circulating_pressure(slow_pump_rate_pressure_psi: float, kill_mud_weight_ppg: float,
                                current_mud_weight_ppg: float) -> float:
    """FCP = SPP * (KMW / OMW)"""
    return slow_pump_rate_pressure_psi * (kill_mud_weight_ppg / current_mud_weight_ppg)


def formation_pressure(current_mud_weight_ppg: float, true_vertical_depth_ft: float, sidpp_psi: float) -> float:
    """Pformation (psi) = 0.052 * OMW * TVD + SIDPP"""
    return 0.052 * current_mud_weight_ppg * true_vertical_depth_ft + sidpp_psi


def maasp(frac_gradient_ppg: float, current_mud_weight_ppg: float, casing_shoe_tvd_ft: float) -> float:
    """Maximum Allowable Annular Surface Pressure (psi)"""
    return (frac_gradient_ppg - current_mud_weight_ppg) * 0.052 * casing_shoe_tvd_ft


def pressure_at_stroke(sidpp_or_icp_psi: float, fcp_psi: float, current_stroke: int, total_strokes: int) -> float:
    """Linear pressure schedule from ICP to FCP as pipe is displaced (Wait & Weight)"""
    if total_strokes <= 0:
        return sidpp_or_icp_psi
    fraction = min(current_stroke / total_strokes, 1.0)
    return sidpp_or_icp_psi - (sidpp_or_icp_psi - fcp_psi) * fraction


# ===========================================================================
# 5. WELLBORE GEOMETRY
# ===========================================================================

def true_vertical_depth(measured_depth_ft: float, inclination_deg: float) -> float:
    """Simplified TVD for a tangent section = MD * cos(inclination)"""
    return measured_depth_ft * math.cos(math.radians(inclination_deg))


def dogleg_severity(incl1_deg: float, incl2_deg: float, azi1_deg: float, azi2_deg: float,
                     course_length_ft: float) -> float:
    """DLS (deg/100ft) using the standard minimum-curvature dogleg angle formula"""
    i1, i2 = math.radians(incl1_deg), math.radians(incl2_deg)
    a1, a2 = math.radians(azi1_deg), math.radians(azi2_deg)
    cos_dl = (math.cos(i1) * math.cos(i2)) + (math.sin(i1) * math.sin(i2) * math.cos(a2 - a1))
    cos_dl = max(-1.0, min(1.0, cos_dl))
    dogleg_deg = math.degrees(math.acos(cos_dl))
    return (dogleg_deg / course_length_ft) * 100 if course_length_ft else 0.0


def horizontal_displacement(measured_depth_ft: float, inclination_deg: float) -> float:
    """Simplified horizontal displacement = MD * sin(inclination)"""
    return measured_depth_ft * math.sin(math.radians(inclination_deg))


# ===========================================================================
# FORMULA REGISTRY (used by the generic /calculator/run endpoint)
# ===========================================================================

FORMULA_REGISTRY: Dict[str, Dict[str, Any]] = {
    # Hydraulics
    "annular_velocity": {"fn": annular_velocity, "label": "Annular Velocity", "unit": "ft/min",
                          "category": "Hydraulics"},
    "bit_nozzle_velocity": {"fn": bit_nozzle_velocity, "label": "Bit Nozzle Velocity", "unit": "ft/s",
                             "category": "Hydraulics"},
    "bit_pressure_loss": {"fn": bit_pressure_loss, "label": "Bit Pressure Loss", "unit": "psi",
                           "category": "Hydraulics"},
    "hydraulic_horsepower_bit": {"fn": hydraulic_horsepower_bit, "label": "Hydraulic Horsepower at Bit",
                                  "unit": "hhp", "category": "Hydraulics"},
    "pump_output_triplex": {"fn": pump_output_triplex, "label": "Pump Output (Triplex)", "unit": "bbl/stroke",
                             "category": "Hydraulics"},
    "pump_output_duplex": {"fn": pump_output_duplex, "label": "Pump Output (Duplex)", "unit": "bbl/stroke",
                            "category": "Hydraulics"},
    "equivalent_circulating_density": {"fn": equivalent_circulating_density, "label": "Equivalent Circulating Density",
                                        "unit": "ppg", "category": "Hydraulics"},
    "reynolds_number": {"fn": reynolds_number, "label": "Reynolds Number", "unit": "dimensionless",
                         "category": "Hydraulics"},
    "critical_flow_rate": {"fn": critical_flow_rate, "label": "Critical Flow Rate", "unit": "gpm",
                            "category": "Hydraulics"},
    "surge_pressure_pipe_movement": {"fn": surge_pressure_pipe_movement, "label": "Surge/Swab Pressure",
                                      "unit": "psi/1000ft", "category": "Hydraulics"},

    # Volumetrics
    "pipe_capacity": {"fn": pipe_capacity, "label": "Pipe Capacity", "unit": "bbl/ft", "category": "Volumetrics"},
    "annular_capacity": {"fn": annular_capacity, "label": "Annular Capacity", "unit": "bbl/ft",
                          "category": "Volumetrics"},
    "displacement": {"fn": displacement, "label": "Pipe Displacement", "unit": "bbl/ft", "category": "Volumetrics"},
    "hole_volume": {"fn": hole_volume, "label": "Hole Volume", "unit": "bbl", "category": "Volumetrics"},
    "total_mud_system_volume": {"fn": total_mud_system_volume, "label": "Total Mud System Volume", "unit": "bbl",
                                 "category": "Volumetrics"},
    "bottoms_up_strokes": {"fn": bottoms_up_strokes, "label": "Bottoms-Up Strokes", "unit": "strokes",
                            "category": "Volumetrics"},

    # Torque, Drag & String Weights
    "buoyancy_factor": {"fn": buoyancy_factor, "label": "Buoyancy Factor", "unit": "dimensionless",
                         "category": "Torque & Drag"},
    "buoyant_weight": {"fn": buoyant_weight, "label": "Buoyant Weight", "unit": "lb", "category": "Torque & Drag"},
    "makeup_torque": {"fn": makeup_torque, "label": "Makeup Torque", "unit": "ft-lb", "category": "Torque & Drag"},
    "drag_force_soft_string": {"fn": drag_force_soft_string, "label": "Drag Force (Soft-String)", "unit": "lb",
                                "category": "Torque & Drag"},
    "hook_load": {"fn": hook_load, "label": "Hook Load", "unit": "lb", "category": "Torque & Drag"},
    "string_stretch": {"fn": string_stretch, "label": "String Stretch", "unit": "ft", "category": "Torque & Drag"},

    # Well Control
    "kill_mud_weight": {"fn": kill_mud_weight, "label": "Kill Mud Weight", "unit": "ppg", "category": "Well Control"},
    "initial_circulating_pressure": {"fn": initial_circulating_pressure, "label": "Initial Circulating Pressure",
                                      "unit": "psi", "category": "Well Control"},
    "final_circulating_pressure": {"fn": final_circulating_pressure, "label": "Final Circulating Pressure",
                                    "unit": "psi", "category": "Well Control"},
    "formation_pressure": {"fn": formation_pressure, "label": "Formation Pressure", "unit": "psi",
                            "category": "Well Control"},
    "maasp": {"fn": maasp, "label": "MAASP", "unit": "psi", "category": "Well Control"},

    # Wellbore Geometry
    "true_vertical_depth": {"fn": true_vertical_depth, "label": "True Vertical Depth", "unit": "ft",
                             "category": "Wellbore Geometry"},
    "dogleg_severity": {"fn": dogleg_severity, "label": "Dogleg Severity", "unit": "deg/100ft",
                         "category": "Wellbore Geometry"},
    "horizontal_displacement": {"fn": horizontal_displacement, "label": "Horizontal Displacement", "unit": "ft",
                                 "category": "Wellbore Geometry"},
}
