import axios from "axios";
import type {
  FormulaGroups,
  FormulaResult,
  ConversionResult,
  KillSheetInput,
  KillSheetResult,
  HoleSection,
  WellboreGeometryResult,
} from "./types";

const client = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 10000,
});

export async function fetchFormulaGroups(): Promise<FormulaGroups> {
  const { data } = await client.get<FormulaGroups>("/calculator/formulas");
  return data;
}

export async function runFormula(
  formulaId: string,
  inputs: Record<string, number>
): Promise<FormulaResult> {
  const { data } = await client.post<FormulaResult>("/calculator/run", {
    formula_id: formulaId,
    inputs,
  });
  return data;
}

export async function runConversion(
  category: string,
  fromUnit: string,
  toUnit: string,
  value: number
): Promise<ConversionResult> {
  const { data } = await client.post<ConversionResult>("/conversion/run", {
    category,
    from_unit: fromUnit,
    to_unit: toUnit,
    value,
  });
  return data;
}

export async function calculateKillSheet(
  payload: KillSheetInput
): Promise<KillSheetResult> {
  const { data } = await client.post<KillSheetResult>(
    "/killsheet/calculate",
    payload
  );
  return data;
}

export async function calculateGeometry(
  sections: HoleSection[],
  inclinationDeg: number
): Promise<WellboreGeometryResult> {
  const { data } = await client.post<WellboreGeometryResult>(
    "/geometry/calculate",
    { sections, inclination_deg: inclinationDeg }
  );
  return data;
}
