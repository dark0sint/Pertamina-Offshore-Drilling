import { useState } from "react";
import { calculateKillSheet } from "../api";
import type { KillSheetInput, KillSheetResult } from "../types";
import { Loader2, ShieldAlert } from "lucide-react";

const initialForm: KillSheetInput = {
  current_mud_weight_ppg: 9.6,
  true_vertical_depth_ft: 8500,
  measured_depth_ft: 9200,
  sidpp_psi: 350,
  sicp_psi: 420,
  slow_pump_rate_pressure_psi: 480,
  slow_pump_rate_spm: 30,
  drill_string_capacity_bbl_per_ft: 0.0087,
  annular_capacity_bbl_per_ft: 0.0459,
  pump_output_bbl_per_stroke: 0.1058,
  frac_gradient_ppg: 14.2,
  casing_shoe_tvd_ft: 4200,
};

const FIELD_LABELS: Record<keyof KillSheetInput, string> = {
  current_mud_weight_ppg: "Current Mud Weight (ppg)",
  true_vertical_depth_ft: "True Vertical Depth (ft)",
  measured_depth_ft: "Measured Depth (ft)",
  sidpp_psi: "SIDPP (psi)",
  sicp_psi: "SICP (psi)",
  slow_pump_rate_pressure_psi: "Slow Pump Rate Pressure (psi)",
  slow_pump_rate_spm: "Slow Pump Rate (spm)",
  drill_string_capacity_bbl_per_ft: "Drill String Capacity (bbl/ft)",
  annular_capacity_bbl_per_ft: "Annular Capacity (bbl/ft)",
  pump_output_bbl_per_stroke: "Pump Output (bbl/stroke)",
  frac_gradient_ppg: "Frac Gradient at Shoe (ppg)",
  casing_shoe_tvd_ft: "Casing Shoe TVD (ft)",
};

export default function KillSheet() {
  const [form, setForm] = useState<KillSheetInput>(initialForm);
  const [result, setResult] = useState<KillSheetResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (key: keyof KillSheetInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value === "" ? undefined : parseFloat(value) }));
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      setLoading(true);
      const res = await calculateKillSheet(form);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Kill sheet calculation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Input form */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="text-pertamina-red" size={22} />
          <h2 className="text-xl font-bold text-pertamina-navy">
            Well Control Kill Sheet
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Driller's Method / Wait-and-Weight — IADC style calculation.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {(Object.keys(FIELD_LABELS) as (keyof KillSheetInput)[]).map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {FIELD_LABELS[key]}
              </label>
              <input
                type="number"
                step="any"
                defaultValue={form[key] as number}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-pertamina-red"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 flex items-center gap-2 bg-pertamina-red hover:bg-pertamina-darkred
                     text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
        >
          {loading && <Loader2 className="animate-spin" size={18} />}
          Calculate Kill Sheet
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Results</h3>
        {!result ? (
          <p className="text-sm text-slate-500">
            Fill in the well data and click "Calculate Kill Sheet" to see results.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ResultCard label="Kill Mud Weight" value={`${result.kill_mud_weight_ppg} ppg`} />
              <ResultCard label="Formation Pressure" value={`${result.formation_pressure_psi} psi`} />
              <ResultCard label="ICP" value={`${result.initial_circulating_pressure_psi} psi`} />
              <ResultCard label="FCP" value={`${result.final_circulating_pressure_psi} psi`} />
              <ResultCard label="Strokes to Bit" value={`${result.strokes_to_bit}`} />
              <ResultCard label="Strokes to Surface" value={`${result.strokes_to_surface}`} />
              <ResultCard label="Time to Bit" value={`${result.time_to_bit_min} min`} />
              <ResultCard label="Time to Surface" value={`${result.time_to_surface_min} min`} />
              {result.maasp_psi !== null && (
                <ResultCard label="MAASP" value={`${result.maasp_psi} psi`} highlight />
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                Drill Pipe Pressure Schedule (ICP → FCP)
              </h4>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Stroke</th>
                      <th className="text-left px-3 py-2">DP Pressure (psi)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.pressure_step_table.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-1.5">{row.stroke}</td>
                        <td className="px-3 py-1.5">{row.drill_pipe_pressure_psi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 border ${
        highlight
          ? "bg-amber-50 border-amber-300"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}
