import mockDataJson from "../public/MockData.json";
import type { ComplexTypeInstance } from "@/types";

type LinkOption = { value: string };
type FormulaOption = { id?: string; label: string; value: string };
type MockDataEntry = ComplexTypeInstance | LinkOption | FormulaOption;
type MockDataMap = Record<string, MockDataEntry[]>;

export const mockData: MockDataMap = mockDataJson.mockData as unknown as MockDataMap;
