export interface XSDAnnotation {
  documentation: string;
}

export interface XSDElement {
  name: string;
  type?: string;
  minOccurs?: string;
  maxOccurs?: string;
  annotation?: XSDAnnotation;
  complexType?: XSDComplexType;
  simpleType?: XSDSimpleType;
  value?: any;
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

export interface XSDSchema {
  elements: { [key: string]: XSDElement };
  complexTypes: { [key: string]: XSDComplexType };
  simpleTypes: { [key: string]: XSDSimpleType };
  entityStructur: Partial<XSDElement>,
  propertyStructur: Partial<XSDElement>,
  relationStructur: Partial<XSDElement>
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