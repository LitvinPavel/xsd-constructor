import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type {
  XSDSchema,
  XSDElement,
  XSDComplexType,
  XSDSimpleType,
  XSDAnnotation,
  XSDEnumeration,
  XSDChoice
} from '../types';

class XSDParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      allowBooleanAttributes: true,
      parseAttributeValue: true,
      trimValues: true,
      alwaysCreateTextNode: true,
      preserveOrder: false,
      isArray: (_name, jpath) => {
        const arrayPaths = [
          'xs:schema.xs:element',
          'xs:schema.xs:complexType',
          'xs:schema.xs:simpleType',
          'xs:complexType.xs:sequence.xs:element',
          'xs:complexType.xs:all.xs:element',
          'xs:complexType.xs:choice.xs:element',
          'xs:complexType.xs:attribute',
          'xs:simpleType.xs:restriction.xs:enumeration',
          'xs:element.xs:simpleType.xs:restriction.xs:enumeration',
        ];
        return arrayPaths.some((path) => jpath.endsWith(path));
      },
    });
  }

  public parseXSDToJSON(xsdContent: string): XSDSchema {
    try {
      const validationResult = XMLValidator.validate(xsdContent);
      if (validationResult !== true) {
        throw new Error(`Invalid XML: ${validationResult.err.msg}`);
      }

      const parsedData = this.parser.parse(xsdContent);
      return this.transformToStructuredJSON(parsedData);
    } catch (error) {
      console.error('Error parsing XSD:', error);
      throw error;
    }
  }

  private transformToStructuredJSON(parsedData: any): XSDSchema {
    const schema = parsedData['xs:schema'];

    const result: XSDSchema = {
      schemaInfo: {
        elementFormDefault: schema['@_elementFormDefault'],
        attributeFormDefault: schema['@_attributeFormDefault'],
      },
      elements: [],
      complexTypes: [],
      simpleTypes: [],
    };

    if (schema['xs:element']) {
      const elements = Array.isArray(schema['xs:element'])
        ? schema['xs:element']
        : [schema['xs:element']];

      result.elements = elements.map((element: any) =>
        this.processElement(element)
      );
    }

    if (schema['xs:complexType']) {
      const complexTypes = Array.isArray(schema['xs:complexType'])
        ? schema['xs:complexType']
        : [schema['xs:complexType']];

      result.complexTypes = complexTypes.map((complexType: any) =>
        this.processComplexType(complexType)
      );
    }

    if (schema['xs:simpleType']) {
      const simpleTypes = Array.isArray(schema['xs:simpleType'])
        ? schema['xs:simpleType']
        : [schema['xs:simpleType']];

      result.simpleTypes = simpleTypes.map((simpleType: any) =>
        this.processSimpleType(simpleType)
      );
    }

    return result;
  }

  private processElement(element: any): XSDElement {
    const processedElement: XSDElement = {
      name: element['@_name'],
      type: element['@_type'],
      minOccurs: element['@_minOccurs'],
      maxOccurs: element['@_maxOccurs'],
    };

    if (element['xs:annotation']) {
      processedElement.annotation = this.processAnnotation(
        element['xs:annotation']
      );
    }

    if (element['xs:complexType']) {
      processedElement.complexType = this.processComplexType(
        element['xs:complexType']
      );
    }

    if (element['xs:simpleType']) {
      processedElement.simpleType = this.processSimpleType(
        element['xs:simpleType']
      );
    }

    return processedElement;
  }

  private processComplexType(complexType: any): XSDComplexType {
    const processedComplexType: XSDComplexType = {
      name: complexType['@_name'],
    };

    if (complexType['xs:annotation']) {
      processedComplexType.annotation = this.processAnnotation(
        complexType['xs:annotation']
      );
    }

    if (complexType['xs:sequence']) {
      processedComplexType.sequence = this.processSequence(
        complexType['xs:sequence']
      );
    }

    if (complexType['xs:all']) {
      processedComplexType.all = this.processAll(complexType['xs:all']);
    }

    if (complexType['xs:choice']) {
      processedComplexType.choice = this.processChoice(
        complexType['xs:choice']
      );
    }

    if (complexType['xs:attribute']) {
      const attributes = Array.isArray(complexType['xs:attribute'])
        ? complexType['xs:attribute']
        : [complexType['xs:attribute']];

      processedComplexType.attributes = attributes.map((attr: any) =>
        this.processAttribute(attr)
      );
    }

    return processedComplexType;
  }

  private processSimpleType(simpleType: any): XSDSimpleType {
    const processedSimpleType: XSDSimpleType = {
      name: simpleType['@_name'],
      restriction: {
        base: '',
        enumerations: undefined,
        pattern: undefined
      }
    };

    if (simpleType['xs:restriction']) {
      const restriction = simpleType['xs:restriction'];
      processedSimpleType.restriction = {
        base: restriction['@_base'],
      };

      if (restriction['xs:enumeration']) {
        const enumerations = Array.isArray(restriction['xs:enumeration'])
          ? restriction['xs:enumeration']
          : [restriction['xs:enumeration']];

        processedSimpleType.restriction.enumerations = enumerations.map(
          (enumItem: any) => this.processEnumeration(enumItem)
        );
      }

      if (restriction['xs:pattern']) {
        processedSimpleType.restriction.pattern =
          restriction['xs:pattern']['@_value'];
      }
    }

    return processedSimpleType;
  }

  private processEnumeration(enumItem: any): XSDEnumeration {
    const enumeration: XSDEnumeration = {
      value: enumItem['@_value'],
    };

    if (enumItem['xs:annotation']) {
      enumeration.annotation = this.processAnnotation(
        enumItem['xs:annotation']
      );
    }

    return enumeration;
  }

  private processSequence(sequence: any): XSDElement[] {
    if (!sequence['xs:element']) return [];

    const elements = Array.isArray(sequence['xs:element'])
      ? sequence['xs:element']
      : [sequence['xs:element']];

    return elements.map((element: any) => this.processElement(element));
  }

  private processAll(all: any): XSDElement[] {
    if (!all['xs:element']) return [];

    const elements = Array.isArray(all['xs:element'])
      ? all['xs:element']
      : [all['xs:element']];

    return elements.map((element: any) => this.processElement(element));
  }

  private processChoice(choice: any): XSDChoice {
    const processedChoice: XSDChoice = {
      elements: [],
    };

    if (choice['xs:element']) {
      const elements = Array.isArray(choice['xs:element'])
        ? choice['xs:element']
        : [choice['xs:element']];

      processedChoice.elements = elements.map((element: any) =>
        this.processElement(element)
      );
    }

    return processedChoice;
  }

  private processAttribute(attribute: any): any {
    const processedAttribute: any = {
      name: attribute['@_name'],
      type: attribute['@_type'],
      use: attribute['@_use'],
    };

    if (attribute['xs:annotation']) {
      processedAttribute.annotation = this.processAnnotation(
        attribute['xs:annotation']
      );
    }

    if (attribute['xs:simpleType']) {
      processedAttribute.simpleType = this.processSimpleType(
        attribute['xs:simpleType']
      );
    }

    return processedAttribute;
  }

  private processAnnotation(annotation: any): XSDAnnotation {
    const processedAnnotation: XSDAnnotation = {
      documentation: '',
    };

    if (annotation['xs:documentation']) {
      const documentation = annotation['xs:documentation'];

      if (typeof documentation === 'string') {
        processedAnnotation.documentation = documentation;
      } else if (documentation['#text']) {
        processedAnnotation.documentation = documentation['#text'];
      } else if (typeof documentation === 'object') {
        processedAnnotation.documentation =
          documentation['#text'] ||
          documentation['@_text'] ||
          JSON.stringify(documentation);
      }
    }

    return processedAnnotation;
  }
}

export { XSDParser };
