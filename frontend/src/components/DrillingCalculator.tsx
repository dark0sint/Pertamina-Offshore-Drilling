import { useEffect, useState } from "react";
import { fetchFormulaGroups, runFormula } from "../api";
import type { FormulaGroups, FormulaMeta, FormulaResult } from "../types";
import { Loader2, PlayCircle } from "lucide-react";

export default function DrillingCalculator() {
  const [groups, setGroups] = useState<FormulaGroups>({});
  const [category, setCategory] = useState<string>("");
  const [selected, setSelected] = useState<FormulaMeta | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<FormulaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFormulaGroups()
      .then((data) => {
        setGroups(data);
        const firstCategory = Object.keys(data)[0];
        setCategory(firstCategory);
      })
      .catch(() => setError("Unable to load formulas. Is the backend running on port 8000?"));
  }, []);

  const selectFormula = (formula: FormulaMeta) => {
    setSelected(formula);
    setResult(null);
    setError(null);
    const initial: Record<string, string> = {};
    formula.inputs.forEach((key) => (initial[key] = ""));
    setInputs(initial);
  };

  const handleCalculate = async () => {
    if (!selected) return;
    setError(null);

    const numericInputs: Record<string, number> = {};
    for (const key of selected.inputs) {
      const val = parseFloat(inputs[key]);
      if (Number.isNaN(val)) {
        setError(`Please provide a valid number for "${key}"`);
        return;
      }
      numericInputs[key] = val;
    }

    try {
      setLoading(true);
      const res = await runFormula(selected.formula_id, numericInputs);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Category / formula list */}
      <div className="bg-white rounded-xl shadow p-4 lg:col-span-1 h-fit">
        <h2 className="font-semibold text-slate-700 mb-3">Categories</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(groups).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs px-2.5 py-1.5 rounded-full border ${
                category === cat
                  ? "bg-pertamina-red text-white border-pertamina-red"
                  : "border-slate-300 text-slate-600 hover:border-pertamina-red"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <ul className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
          {(groups[category] ?? []).map((formula) => (
            <li key={formula.formula_id}>
              <button
                onClick={() => selectFormula(formula)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selected?.formula_id === formula.formula_id
                    ? "bg-pertamina-navy text-white"
                    : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                {formula.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Formula detail / calculator */}
      <div className="bg-white rounded-xl shadow p-6 lg:col-span-3">
        {!selected ? (
          <p className="text-slate-500 text-sm">
            Select a formula from the left panel to begin calculating.
          </p>
        ) : (
          <>
            <h2 className="text-xl font-bold text-pertamina-navy mb-1">
              {selected.label}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Result unit: <span className="font-medium">{selected.unit}</span>
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {selected.inputs.map((key) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">
                    {key.replaceAll("_", " ")}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={inputs[key] ?? ""}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-pertamina-red"
                    placeholder="0.0"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleCalculate}
              disabled={loading}
              className="flex items-center gap-2 bg-pertamina-red hover:bg-pertamina-darkred
                         text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <PlayCircle size={18} />}
              Calculate
            </button>

            {error && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </p>
            )}

            {result && (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <p className="text-sm text-emerald-700 font-medium">Result</p>
                <p className="text-3xl font-bold text-emerald-800">
                  {result.result.toLocaleString()}{" "}
                  <span className="text-lg font-medium">{result.unit}</span>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
