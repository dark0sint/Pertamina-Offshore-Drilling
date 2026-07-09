import { useState } from "react";
import { runConversion } from "../api";
import { ArrowLeftRight, Loader2 } from "lucide-react";

const UNIT_OPTIONS: Record<string, string[]> = {
  temperature: ["C", "F", "K"],
  pressure: ["psi", "bar", "kPa", "atm"],
  density: ["ppg", "sg", "kg_m3", "lb_ft3"],
  length: ["m", "ft", "in"],
  volume: ["bbl", "m3", "gal_us", "L"],
  flow_rate: ["gpm", "bpm", "L_min", "m3_min"],
};

const CATEGORY_LABELS: Record<string, string> = {
  temperature: "Temperature",
  pressure: "Pressure",
  density: "Mud Density",
  length: "Length / Depth",
  volume: "Volume",
  flow_rate: "Flow Rate",
};

export default function UnitConverter() {
  const [category, setCategory] = useState("pressure");
  const [fromUnit, setFromUnit] = useState(UNIT_OPTIONS["pressure"][0]);
  const [toUnit, setToUnit] = useState(UNIT_OPTIONS["pressure"][1]);
  const [value, setValue] = useState<string>("");
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeCategory = (cat: string) => {
    setCategory(cat);
    setFromUnit(UNIT_OPTIONS[cat][0]);
    setToUnit(UNIT_OPTIONS[cat][1] ?? UNIT_OPTIONS[cat][0]);
    setResult(null);
  };

  const handleConvert = async () => {
    const numeric = parseFloat(value);
    if (Number.isNaN(numeric)) {
      setError("Please enter a valid numeric value");
      return;
    }
    setError(null);
    try {
      setLoading(true);
      const res = await runConversion(category, fromUnit, toUnit, numeric);
      setResult(res.value);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-pertamina-navy mb-1">
        Petroleum Unit Conversion
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Convert common drilling parameters between field and metric units.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {Object.keys(UNIT_OPTIONS).map((cat) => (
          <button
            key={cat}
            onClick={() => changeCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              category === cat
                ? "bg-pertamina-red text-white border-pertamina-red"
                : "border-slate-300 text-slate-600 hover:border-pertamina-red"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <select
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {UNIT_OPTIONS[category].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setFromUnit(toUnit);
            setToUnit(fromUnit);
          }}
          className="p-2 rounded-full border border-slate-300 hover:bg-slate-100 mb-1"
          title="Swap units"
        >
          <ArrowLeftRight size={16} />
        </button>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <select
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {UNIT_OPTIONS[category].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter a value"
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4
                   focus:outline-none focus:ring-2 focus:ring-pertamina-red"
      />

      <button
        onClick={handleConvert}
        disabled={loading}
        className="flex items-center gap-2 bg-pertamina-red hover:bg-pertamina-darkred
                   text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
      >
        {loading && <Loader2 className="animate-spin" size={18} />}
        Convert
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      {result !== null && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <p className="text-sm text-emerald-700 font-medium">Converted Value</p>
          <p className="text-3xl font-bold text-emerald-800">
            {result.toLocaleString()} <span className="text-lg font-medium">{toUnit}</span>
          </p>
        </div>
      )}
    </div>
  );
}
