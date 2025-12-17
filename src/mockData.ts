import mockDataJson from "../public/MockData.json";
import type { ComplexTypeInstance } from "@/types";

type MockDataMap = Record<string, ComplexTypeInstance[]>;

export const mockData: MockDataMap = mockDataJson.mockData as unknown as MockDataMap;
