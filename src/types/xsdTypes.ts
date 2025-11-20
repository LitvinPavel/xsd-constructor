export interface XSDAttribute {
  '@_name': string;
  '@_type': string;
  '@_use'?: 'required' | 'optional';
  '@_default'?: string;
}

export interface XSDDocumentation {
  '#text'?: string;
}

export interface XSDAnnotation {
  'xs:documentation'?: XSDDocumentation | string;
}

export interface XSDEnumeration {
  '@_value': string;
}

export interface XSDRestriction {
  '@_base'?: string;
  'xs:enumeration'?: XSDEnumeration | XSDEnumeration[];
}

export interface XSDSimpleType {
  'xs:restriction'?: XSDRestriction;
}

export interface XSDSequence {
  'xs:element'?: XSDElement | XSDElement[];
}

export interface XSDExtension {
  '@_base': string;
  'xs:sequence'?: XSDSequence;
}

export interface XSDComplexContent {
  'xs:extension'?: XSDExtension;
}

export interface XSDComplexType {
  'xs:sequence'?: XSDSequence;
  'xs:complexContent'?: XSDComplexContent;
}

export interface XSDElement {
  '@_name'?: string;
  '@_type'?: string;
  '@_minOccurs'?: string;
  '@_maxOccurs'?: string;
  'xs:annotation'?: XSDAnnotation;
  'xs:simpleType'?: XSDSimpleType;
  'xs:complexType'?: XSDComplexType;
}

export interface XSDSchema {
  'xs:element'?: XSDElement | XSDElement[];
}

export interface XSDRoot {
  'xs:schema'?: XSDSchema;
}

export interface XSDValidationResult {
  isValid: boolean;
  errors: string[];
}
