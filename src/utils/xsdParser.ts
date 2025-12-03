// utils/xsdParser.ts
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { XSDSchema, XSDElement, XSDComplexType } from '@/types';

export class XSDParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
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
          'xs:simpleType.xs:restriction.xs:enumeration'
        ];
        return arrayPaths.some(path => jpath.endsWith(path));
      }
    });
  }

  public parseXSDToJSON(xsdContent: string): XSDSchema {
    try {
      const validationResult = XMLValidator.validate(xsdContent);
      if (validationResult !== true) {
        throw new Error(`Invalid XML: ${validationResult.err.msg}`);
      }

      const parsedData = this.parser.parse(xsdContent);
      const schema = parsedData['xs:schema'];
      
      const result: XSDSchema = {
        elements: {},
        complexTypes: {},
        simpleTypes: {},
        entityStructur: {},
        propertyStructur: {},
        relationStructur: {}
      };

      // Process elements
      if (schema['xs:element']) {
        const elements = Array.isArray(schema['xs:element']) 
          ? schema['xs:element'] 
          : [schema['xs:element']];
        result.elements = this.processElements(elements);
      }

      // Process complex types
      if (schema['xs:complexType']) {
        const complexTypes = Array.isArray(schema['xs:complexType']) 
          ? schema['xs:complexType'] 
          : [schema['xs:complexType']];
        result.complexTypes = this.processComplexTypes(complexTypes);
      }

      // Process simple types
      if (schema['xs:simpleType']) {
        const simpleTypes = Array.isArray(schema['xs:simpleType']) 
          ? schema['xs:simpleType'] 
          : [schema['xs:simpleType']];
        result.simpleTypes = this.processSimpleTypes(simpleTypes);
      }

      return result;
    } catch (error) {
      console.error('Error parsing XSD:', error);
      throw error;
    }
  }

  public getComplexTypeDefinitions(parsedData: any): { [key: string]: XSDComplexType } {
    const schema = parsedData['xs:schema'];
    const definitions: { [key: string]: XSDComplexType } = {};

    const collectTypes = (element: any) => {
      if (element['@_name']) {
        definitions[element['@_name']] = this.extractComplexTypeStructure(element);
      }
      
      if (element['xs:complexType']) {
        const nestedTypes = Array.isArray(element['xs:complexType']) 
          ? element['xs:complexType'] 
          : [element['xs:complexType']];
        nestedTypes.forEach(collectTypes);
      }
    };
    
    if (schema['xs:complexType']) {
      const complexTypes = Array.isArray(schema['xs:complexType']) 
        ? schema['xs:complexType'] 
        : [schema['xs:complexType']];
      complexTypes.forEach(collectTypes);
    }
    
    if (schema['xs:element']) {
      const elements = Array.isArray(schema['xs:element']) 
        ? schema['xs:element'] 
        : [schema['xs:element']];
      elements.forEach(collectTypes);
    }
    
    return definitions;
  }

  private processElements(elements: any[]): { [key: string]: XSDElement } {
    const result: { [key: string]: XSDElement } = {};
    elements.forEach((element, index) => {
      const key = element['@_name'] || `element_${index}`;
      result[key] = this.extractElementStructure(element);
    });
    return result;
  }

  private processComplexTypes(complexTypes: any[]): { [key: string]: XSDComplexType } {
    const result: { [key: string]: XSDComplexType } = {};
    complexTypes.forEach((complexType, index) => {
      const key = complexType['@_name'] || `complexType_${index}`;
      result[key] = this.extractComplexTypeStructure(complexType);
    });
    return result;
  }

  private processSimpleTypes(simpleTypes: any[]): { [key: string]: any } {
    const result: { [key: string]: any } = {};
    simpleTypes.forEach((simpleType, index) => {
      const key = simpleType['@_name'] || `simpleType_${index}`;
      result[key] = this.extractSimpleTypeStructure(simpleType);
    });
    return result;
  }

  private extractElementStructure(element: any): XSDElement {
    const elementStruct: XSDElement = {
      name: element['@_name'],
      type: element['@_type'],
      minOccurs: element['@_minOccurs'],
      maxOccurs: element['@_maxOccurs']
    };

    if (element['xs:annotation']) {
      elementStruct.annotation = this.processAnnotation(element['xs:annotation']);
    }

    if (element['xs:complexType']) {
      elementStruct.complexType = this.extractComplexTypeStructure(element['xs:complexType']);
    }

    if (element['xs:simpleType']?.['xs:restriction']) {
      const restriction = element['xs:simpleType']['xs:restriction'];
      elementStruct.simpleType = {
        restriction: {
          base: restriction['@_base'],
          enumerations: restriction['xs:enumeration'] 
            ? (Array.isArray(restriction['xs:enumeration']) 
                ? restriction['xs:enumeration'].map((e: any) => this.processEnumeration(e))
                : [this.processEnumeration(restriction['xs:enumeration'])])
            : undefined,
          pattern: restriction['xs:pattern']?.['@_value']
        }
      };
    }

    return elementStruct;
  }

  private extractComplexTypeStructure(complexType: any): XSDComplexType {
    const structure: XSDComplexType = {
      name: complexType['@_name'],
      annotation: complexType['xs:annotation'] ? this.processAnnotation(complexType['xs:annotation']) : undefined,
      sequence: {},
      all: {},
      attributes: {},
      choice: undefined,
      complexContent: undefined
    };

    if (complexType['xs:complexContent']) {
      structure.complexContent = this.extractComplexContentStructure(complexType['xs:complexContent']);
    }

    if (complexType['xs:sequence']) {
      structure.sequence = this.extractSequenceOrAllStructure(complexType['xs:sequence']);
    }

    if (complexType['xs:all']) {
      structure.all = this.extractSequenceOrAllStructure(complexType['xs:all']);
    }

    if (complexType['xs:choice']) {
      structure.choice = this.extractChoiceStructure(complexType['xs:choice']);
    }

    if (complexType['xs:attribute']) {
      structure.attributes = this.extractAttributesStructure(complexType['xs:attribute']);
    }

    return structure;
  }

  private extractComplexContentStructure(complexContent: any): any {
    const structure: any = {};
    
    if (complexContent['xs:extension']) {
      const extension = complexContent['xs:extension'];
      structure.extension = {
        base: extension['@_base'],
        attributes: {},
        sequence: {}
      };
      
      if (extension['xs:attribute']) {
        structure.extension.attributes = this.extractAttributesStructure(extension['xs:attribute']);
      }
      
      if (extension['xs:sequence']) {
        structure.extension.sequence = this.extractSequenceOrAllStructure(extension['xs:sequence']);
      }
    }
    
    return structure;
  }

  private extractSequenceOrAllStructure(sequenceOrAll: any): any {
    const structure: any = {};
    
    if (sequenceOrAll['xs:element']) {
      const elements = Array.isArray(sequenceOrAll['xs:element']) 
        ? sequenceOrAll['xs:element'] 
        : [sequenceOrAll['xs:element']];
      
      elements.forEach((element: any) => {
        const elementName = element['@_name'];
        if (elementName) {
          structure[elementName] = this.extractElementStructure(element);
        }
      });
    }
    
    return structure;
  }

  private extractChoiceStructure(choice: any): any {
    const choiceStructure: any = {
      elements: {},
      annotation: choice['xs:annotation'] ? this.processAnnotation(choice['xs:annotation']) : undefined
    };

    if (choice['xs:element']) {
      const elements = Array.isArray(choice['xs:element']) 
        ? choice['xs:element'] 
        : [choice['xs:element']];
      
      elements.forEach((element: any) => {
        const elementName = element['@_name'];
        if (elementName) {
          choiceStructure.elements[elementName] = this.extractElementStructure(element);
        }
      });
    }

    return choiceStructure;
  }

  private extractAttributesStructure(attributes: any): any {
    const structure: any = {};
    
    const attrs = Array.isArray(attributes) ? attributes : [attributes];
    
    attrs.forEach((attribute: any) => {
      const attrName = attribute['@_name'];
      if (attrName) {
        structure[attrName] = this.extractAttributeStructure(attribute);
      }
    });
    
    return structure;
  }

  private extractAttributeStructure(attribute: any): any {
    const attrStruct: any = {
      name: attribute['@_name'],
      type: attribute['@_type'],
      use: attribute['@_use'] || 'optional'
    };

    if (attribute['xs:annotation']) {
      attrStruct.annotation = this.processAnnotation(attribute['xs:annotation']);
    }

    if (attribute['xs:simpleType']?.['xs:restriction']) {
      const restriction = attribute['xs:simpleType']['xs:restriction'];
      attrStruct.simpleType = {
        restriction: {
          base: restriction['@_base'],
          enumerations: restriction['xs:enumeration'] 
            ? (Array.isArray(restriction['xs:enumeration']) 
                ? restriction['xs:enumeration'].map((e: any) => this.processEnumeration(e))
                : [this.processEnumeration(restriction['xs:enumeration'])])
            : undefined,
          pattern: restriction['xs:pattern']?.['@_value']
        }
      };
    }

    return attrStruct;
  }

  private extractSimpleTypeStructure(simpleType: any): any {
    const processedSimpleType: any = {
      name: simpleType['@_name']
    };

    if (simpleType['xs:restriction']) {
      const restriction = simpleType['xs:restriction'];
      processedSimpleType.restriction = {
        base: restriction['@_base']
      };

      if (restriction['xs:enumeration']) {
        const enumerations = Array.isArray(restriction['xs:enumeration']) 
          ? restriction['xs:enumeration'] 
          : [restriction['xs:enumeration']];
        
        processedSimpleType.restriction.enumerations = enumerations.map((enumItem: any) => 
          this.processEnumeration(enumItem)
        );
      }

      if (restriction['xs:pattern']) {
        processedSimpleType.restriction.pattern = restriction['xs:pattern']['@_value'];
      }
    }

    return processedSimpleType;
  }

  private processAnnotation(annotation: any): any {
    if (!annotation) return { documentation: '' };
    
    if (annotation['xs:documentation']) {
      const documentation = annotation['xs:documentation'];
      let docText = '';
      
      if (typeof documentation === 'string') {
        docText = documentation;
      } else if (documentation['#text']) {
        docText = documentation['#text'];
      } else if (typeof documentation === 'object') {
        docText = documentation['#text'] || documentation['@_text'] || JSON.stringify(documentation);
      }
      
      return { documentation: docText };
    }
    
    return { documentation: '' };
  }

  private processEnumeration(enumItem: any): any {
    const enumeration: any = {
      value: enumItem['@_value']
    };

    if (enumItem['xs:annotation']) {
      enumeration.annotation = this.processAnnotation(enumItem['xs:annotation']);
    }

    return enumeration;
  }
}