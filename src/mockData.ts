import mockDataJson from "../public/MockData.json";
import type { ComplexTypeInstance } from "@/types";

type SelectOption = { id?: string; label?: string; value: string };
type MockDataEntry = ComplexTypeInstance | SelectOption;
type MockDataMap = Record<string, MockDataEntry[]>;

export const mockData: MockDataMap = mockDataJson.mockData as unknown as MockDataMap;
