export interface FormField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'choice' | 'object' | 'array' | 'graph' | 'table' | 'formula';
  label: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: string[];
  documentation?: string;
  layer: string;
  category: string;
  editable: boolean;
}

export interface FormData {
  [key: string]: string | number | boolean | null;
}

export interface LayerFields {
  MDATA: FormField[];
  VIEW: FormField[];
  DMODEL: FormField[];
  OTHER: FormField[];
}

export interface ParsingResult {
  success: boolean;
  fields: FormField[];
  error?: string;
}

export interface LayerConfig {
  name: string;
  displayName: string;
  visible: boolean;
  categories: CategoryConfig[];
}

export interface CategoryConfig {
  name: string;
  displayName: string;
  editableTypes: FormField['type'][];
}