export interface XMLNode {
  [key: string]: XMLNode | string | number | boolean;
}

export interface XMLGenerationOptions {
  prettyPrint?: boolean;
  encoding?: string;
  version?: string;
}

export interface XMLGenerationResult {
  success: boolean;
  xml: string;
  error?: string;
}
