import { useState } from "react";
import { calculateGeometry } from "../api";
import type { HoleSection, WellboreGeometryResult } from "../types";
import { Loader2, Plus, Trash2, GitBranch } from "lucide-react";

const defaultSections: HoleSection[] = [
  { name: "36in Conductor", top_md_ft: 0, bottom_md_ft: 300, hole_or_casing_id_in: 36, pipe_od_in: 30, is_cased: true },
  { name: "26in Surface Hole", top_md_ft: 300, bottom_md_ft: 3000, hole_or_casing_id_in: 26, pipe_od_in: 20, is_cased: false },
  { name: "17.5in Intermediate Hole", top_md_ft: 3000, bottom_md_ft: 8500, hole_or_casing_id_in: 17.5, pipe_od_in: 13.375, is_cased: false },
  { name: "12.25in Production Hole", top_md_ft: 8500, bottom_md_ft: 12000, hole_or_casing_id_in: 12.25, pipe_od_in: 9.625, is_cased: false },
];

export default function WellboreGeometry() {
  const [sections, setSections] = useState<HoleSection[]>(defaultSections);
  const [inclination, setInclination] = useState(0);
  const [result, setResult] = useState<WellboreGeometryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSection = (index: number, key: keyof HoleSection, value: string | boolean) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
              ...s,
              [key]:
                key === "name" || key === "is_cased"
                  ? value
                  : parseFloat(value as string) || 0,
            }
          : s
      )
    );
  };

  const addSection = () => {
    const last = sections[sections.length - 1];
    setSections((prev) => [
      ...prev,
      {
        name: `New Section ${prev.length + 1}`,
        top_md_ft: last ? last.bottom_md_ft : 0,
        bottom_md_ft: last ? last.bottom_md_ft + 1000 : 1000,
        hole_or_casing_id_in: 8.5,
        pipe_od_in: 5,
        is_cased: false,
      },
    ]);
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCalculate = async () => {
    setError(null);
    try {
      setLoading(true);
      const res = await calculateGeometry(sections, inclination);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Geometry calculation failed");
    } finally {
      setLoading(false);
    }
  };

  const maxDepth = sections.length ? sections[sections.length - 1].bottom_md_ft : 1;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Section editor */}
      <div className="bg-white rounded-xl shadow p-6 xl:col-span-2">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch className="text-pertamina-red" size={22} />
          <h2 className="text-xl font-bold text-pertamina-navy">Wellbore Geometry</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Define hole/casing sections to compute capacities and volumes.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Average Inclination (deg)
          </label>
          <input
            type="number"
            step="any"
            value={inclination}
            onChange={(e) => setInclination(parseFloat(e.target.value) || 0)}
            className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {sections.map((section, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-6 gap-2">
              <input
                value={section.name}
                onChange={(e) => updateSection(i, "name", e.target.value)}
                className="col-span-2 sm:col-span-2 border border-slate-300 rounded px-2 py-1.5 text-xs"
                placeholder="Section name"
              />
              <input
                type="number"
                value={section.top_md_ft}
                onChange={(e) => updateSection(i, "top_md_ft", e.target.value)}
                className="border border-slate-300 rounded px-2 py-1.5 text-xs"
                placeholder="Top MD"
              />
              <input
                type="number"
                value={section.bottom_md_ft}
                onChange={(e) => updateSection(i, "bottom_md_ft", e.target.value)}
                className="border border-slate-300 rounded px-2 py-1.5 text-xs"
                placeholder="Bottom MD"
              />
              <input
                type="number"
                value={section.hole_or_casing_id_in}
                onChange={(e) => updateSection(i, "hole_or_casing_id_in", e.target.value)}
                className="border border-slate-300 rounded px-2 py-1.5 text-xs"
                placeholder="Hole/Casing ID (in)"
              />
              <div className="flex gap-1">
                <input
                  type="number"
                  value={section.pipe_od_in}
                  onChange={(e) => updateSection(i, "pipe_od_in", e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                  placeholder="Pipe OD (in)"
                />
                <button
                  onClick={() => removeSection(i)}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                  title="Remove section"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={addSection}
            className="flex items-center gap-1 text-sm border border-slate-300 rounded-lg px-3 py-2
                       hover:bg-slate-50"
          >
            <Plus size={16} /> Add Section
          </button>
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="flex items-center gap-2 bg-pertamina-red hover:bg-pertamina-darkred
                       text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            Calculate Geometry
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}
      </div>

      {/* Schematic + results */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-slate-700 mb-3">Well Schematic</h3>
        <svg viewBox="0 0 200 400" className="w-full h-64 bg-slate-50 rounded-lg border border-slate-200">
          <line x1="100" y1="0" x2="100" y2="400" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4" />
          {sections.map((s, i) => {
            const yTop = (s.top_md_ft / maxDepth) * 380 + 10;
            const yBottom = (s.bottom_md_ft / maxDepth) * 380 + 10;
            const width = Math.max(6, s.hole_or_casing_id_in * 2);
            return (
              <rect
                key={i}
                x={100 - width / 2}
                y={yTop}
                width={width}
                height={Math.max(2, yBottom - yTop)}
                fill={s.is_cased ? "#0B1F3A" : "#DA251D22"}
                stroke={s.is_cased ? "#0B1F3A" : "#DA251D"}
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {result && (
          <div className="mt-4 space-y-2">
            <ResultRow label="Total MD" value={`${result.total_measured_depth_ft} ft`} />
            <ResultRow label="Total TVD" value={`${result.total_true_vertical_depth_ft} ft`} />
            <ResultRow label="Total Annular Volume" value={`${result.total_annular_volume_bbl} bbl`} />

            <div className="mt-3 max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5">Section</th>
                    <th className="text-left px-2 py-1.5">Vol (bbl)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.sections.map((s, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{s.name}</td>
                      <td className="px-2 py-1.5">{s.annular_volume_bbl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b border-slate-100 pb-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
