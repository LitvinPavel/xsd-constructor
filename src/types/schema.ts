export interface XSDAnnotation {
  documentation: string;
}

export interface XSDElement {
  name: string;
  type?: string;
  minOccurs?: string;
  maxOccurs?: string;
  annotation?: XSDAnnotation;
  skipInXml?: boolean;
  complexType?: XSDComplexType;
  simpleType?: XSDSimpleType;
  value?: any;
  computedValue?: { [key: string]: string };
}

export interface XSDComplexType {
  name?: string;
  annotation?: XSDAnnotation;
  sequence?: { [key: string]: XSDElement };
  all?: { [key: string]: XSDElement };
  choice?: XSDChoice;
  attributes?: { [key: string]: XSDAttribute };
  complexContent?: XSDComplexContent;
}

export interface XSDComplexContent {
  extension: {
    base: string;
    attributes?: { [key: string]: XSDAttribute };
    sequence?: { [key: string]: XSDElement };
  };
}

export interface XSDChoice {
  elements: { [key: string]: XSDElement };
  annotation?: XSDAnnotation;
}

export interface XSDSimpleType {
  name?: string;
  restriction: {
    base: string;
    enumerations?: XSDEnumeration[];
    pattern?: string;
  };
}

export interface XSDAttribute {
  name: string;
  type?: string;
  use: string;
  annotation?: XSDAnnotation;
  simpleType?: XSDSimpleType;
  value?: any;
}

export interface XSDEnumeration {
  value: string;
  annotation?: XSDAnnotation;
}

export interface PRuleLogicalUnit {
  [key: string]: string;
}

export interface XSDSchema {
  elements: { [key: string]: XSDElement };
  complexTypes: { [key: string]: XSDComplexType };
  simpleTypes: { [key: string]: XSDSimpleType };
  entityStructur: Partial<XSDElement>;
  propertyStructur: Partial<XSDElement>;
  relationStructur: Partial<XSDElement>;
  logicalUnitStructur?: Partial<XSDElement>;
  pRuleLogicalUnits?: { [key: string]: PRuleLogicalUnit };
  pRuleManualInputs?: { [key: string]: boolean };
}

export interface ComplexTypeInstance {
  id: string;
  name: string;
  type: string;
  data: any;
  annotation?: {
    documentation: string;
  };
}

export interface TreeNodeData {
  key: string;
  element: XSDElement;
  level: number;
  parentKey?: string;
  children?: TreeNodeData[];
  path: string;
  hasChildren: boolean;
}
