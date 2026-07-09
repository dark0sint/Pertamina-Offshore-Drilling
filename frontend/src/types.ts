export interface FormulaMeta {
  formula_id: string;
  label: string;
  unit: string;
  inputs: string[];
}

export type FormulaGroups = Record<string, FormulaMeta[]>;

export interface FormulaResult {
  formula_id: string;
  label: string;
  result: number;
  unit: string;
}

export interface ConversionResult {
  value: number;
  from_unit: string;
  to_unit: string;
  category: string;
}

export interface KillSheetInput {
  current_mud_weight_ppg: number;
  true_vertical_depth_ft: number;
  measured_depth_ft: number;
  sidpp_psi: number;
  sicp_psi: number;
  slow_pump_rate_pressure_psi: number;
  slow_pump_rate_spm: number;
  drill_string_capacity_bbl_per_ft: number;
  annular_capacity_bbl_per_ft: number;
  pump_output_bbl_per_stroke: number;
  frac_gradient_ppg?: number;
  casing_shoe_tvd_ft?: number;
}

export interface KillSheetResult {
  kill_mud_weight_ppg: number;
  initial_circulating_pressure_psi: number;
  final_circulating_pressure_psi: number;
  strokes_to_bit: number;
  strokes_to_surface: number;
  total_strokes_bottoms_up: number;
  time_to_bit_min: number;
  time_to_surface_min: number;
  maasp_psi: number | null;
  formation_pressure_psi: number;
  pressure_step_table: { stroke: number; drill_pipe_pressure_psi: number }[];
}

export interface HoleSection {
  name: string;
  top_md_ft: number;
  bottom_md_ft: number;
  hole_or_casing_id_in: number;
  pipe_od_in: number;
  is_cased: boolean;
}

export interface SectionVolumeResult {
  name: string;
  length_ft: number;
  capacity_bbl_per_ft: number;
  annular_volume_bbl: number;
  displacement_bbl_per_ft: number;
  tvd_ft: number;
}

export interface WellboreGeometryResult {
  sections: SectionVolumeResult[];
  total_annular_volume_bbl: number;
  total_measured_depth_ft: number;
  total_true_vertical_depth_ft: number;
}
