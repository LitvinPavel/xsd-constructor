export interface XSDSchema {
  schemaInfo: {
    elementFormDefault?: string;
    attributeFormDefault?: string;
  };
  elements: XSDElement[];
  complexTypes: XSDComplexType[];
  simpleTypes: XSDSimpleType[];
}

export interface XSDElement {
  name: string;
  type?: string;
  minOccurs?: string;
  maxOccurs?: string;
  annotation?: XSDAnnotation;
  complexType?: XSDComplexType;
  simpleType?: XSDSimpleType;
}

export interface XSDComplexType {
  name: string;
  annotation?: XSDAnnotation;
  sequence?: XSDElement[];
  all?: XSDElement[];
  choice?: XSDChoice;
  attributes?: XSDAttribute[];
  complexContent?: XSDComplexContent;
}

export interface XSDComplexContent {
  extension: {
    base: string;
    attributes?: XSDAttribute[];
  };
}

export interface XSDChoice {
  elements: XSDElement[];
}

export interface XSDSimpleType {
  name: string;
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
}

export interface XSDAnnotation {
  documentation: string;
}

export interface XSDEnumeration {
  value: string;
  annotation?: XSDAnnotation;
}

export interface FormField {
  name: string;
  fullName: string;
  type: string;
  label: string;
  required: boolean;
  value: any;
  options?: string[]; // для enumerations
}
