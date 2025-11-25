import { XMLParser, XMLValidator } from 'fast-xml-parser';

// Типы для структуры XSD схемы

interface XSDElement {
  name: string;
  type?: string;
  minOccurs?: string;
  maxOccurs?: string;
  annotation?: XSDAnnotation;
  complexType?: XSDComplexType;
  simpleType?: XSDSimpleType;
  value?: any;
}

interface XSDComplexType {
  name: string;
  annotation?: XSDAnnotation;
  sequence?: { [key: string]: XSDElement };
  all?: { [key: string]: XSDElement };
  choice?: XSDChoice;
  attributes?: { [key: string]: XSDAttribute };
  complexContent?: XSDComplexContent;
}

interface XSDComplexContent {
  extension: {
    base: string;
    attributes?: { [key: string]: XSDAttribute };
  };
}

interface XSDChoice {
  elements: { [key: string]: XSDElement };
}

interface XSDSimpleType {
  name: string;
  restriction: {
    base: string;
    enumerations?: XSDEnumeration[];
    pattern?: string;
  };
}

interface XSDAttribute {
  name: string;
  type?: string;
  use: string;
  annotation?: XSDAnnotation;
  simpleType?: XSDSimpleType;
  value?: any;
}

interface XSDAnnotation {
  documentation: string;
}

interface XSDEnumeration {
  value: string;
  annotation?: XSDAnnotation;
}

// Класс парсера XSD
class XSDParser {
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
          'xs:simpleType.xs:restriction.xs:enumeration',
          'xs:element.xs:simpleType.xs:restriction.xs:enumeration'
        ];
        return arrayPaths.some(path => jpath.endsWith(path));
      }
    });
  }

  // Основной метод парсинга
  public parseXSDToJSON(xsdContent: string): any {
    try {
      // Валидация XML
      const validationResult = XMLValidator.validate(xsdContent);
      if (validationResult !== true) {
        throw new Error(`Invalid XML: ${validationResult.err.msg}`);
      }

      // Парсинг XML
      const parsedData = this.parser.parse(xsdContent);
      
      // Преобразование в структурированный JSON
      return this.transformToStructuredJSON(parsedData);
    } catch (error) {
      console.error('Error parsing XSD:', error);
      throw error;
    }
  }

  // Метод для получения определений сложных типов в структурированном виде
public getComplexTypeDefinitions(parsedData: any): { [key: string]: any } {
  const schema = parsedData['xs:schema'];
  const definitions: { [key: string]: any } = {};

  if (schema['xs:complexType']) {
    const complexTypes = Array.isArray(schema['xs:complexType']) 
      ? schema['xs:complexType'] 
      : [schema['xs:complexType']];
    
    complexTypes.forEach((complexType: any) => {
      const name = complexType['@_name'];
      if (name) {
        definitions[name] = this.extractComplexTypeStructure(complexType);
      }
    });
  }

  return definitions;
}

// Извлечение структуры complexType
private extractComplexTypeStructure(complexType: any): any {
  const structure: any = {
    name: complexType['@_name'],
    annotation: complexType['xs:annotation'] ? this.processAnnotation(complexType['xs:annotation']) : undefined,
    sequence: {},
    all: {},
    attributes: {},
    choice: undefined
  };

  // Обработка sequence
  if (complexType['xs:sequence']) {
    structure.sequence = this.extractSequenceOrAllStructure(complexType['xs:sequence']);
    
    // Особенная обработка для Condition - извлекаем choice из sequence
    if (complexType['@_name'] === 'Condition' && complexType['xs:sequence']['xs:choice']) {
      structure.choice = this.extractChoiceStructure(complexType['xs:sequence']['xs:choice']);
    }
  }

  // Обработка all
  if (complexType['xs:all']) {
    structure.all = this.extractSequenceOrAllStructure(complexType['xs:all']);
  }

  // Обработка choice на верхнем уровне
  if (complexType['xs:choice']) {
    structure.choice = this.extractChoiceStructure(complexType['xs:choice']);
  }

  // Обработка атрибутов
  if (complexType['xs:attribute']) {
    structure.attributes = this.extractAttributesStructure(complexType['xs:attribute']);
  }

  return structure;
}

// Новая функция для извлечения sequence или all
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

// Улучшенная функция для извлечения choice
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

// Функция для извлечения атрибутов
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

// Извлечение структуры элемента
private extractElementStructure(element: any): any {
  const elementStruct: any = {
    name: element['@_name'],
    type: element['@_type'],
    minOccurs: element['@_minOccurs'] || '1',
    maxOccurs: element['@_maxOccurs'] || '1',
    annotation: element['xs:annotation'] ? this.processAnnotation(element['xs:annotation']) : undefined
  };

  // Обработка встроенного simpleType
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

  // Обработка встроенного complexType
  if (element['xs:complexType']) {
    elementStruct.complexType = this.extractComplexTypeStructure(element['xs:complexType']);
  }

  return elementStruct;
}

// Извлечение структуры атрибута
private extractAttributeStructure(attribute: any): any {
  const attrStruct: any = {
    name: attribute['@_name'],
    type: attribute['@_type'],
    use: attribute['@_use'] || 'optional',
    annotation: attribute['xs:annotation'] ? this.processAnnotation(attribute['xs:annotation']) : undefined
  };

  // Обработка встроенного simpleType для атрибута
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

  // Преобразование сырых данных в структурированный JSON
  private transformToStructuredJSON(parsedData: any): any {
    const schema = parsedData['xs:schema'];
    
    const result: any = {
      schemaInfo: {
        elementFormDefault: schema['@_elementFormDefault'],
        attributeFormDefault: schema['@_attributeFormDefault']
      },
      elements: {},
      complexTypes: {},
      simpleTypes: {}
    };

    // Обработка элементов как объекта
    if (schema['xs:element']) {
      const elements = Array.isArray(schema['xs:element']) 
        ? schema['xs:element'] 
        : [schema['xs:element']];
      
      result.elements = this.arrayToObject(elements, 'name');
    }

    // Обработка complex types как объекта
    if (schema['xs:complexType']) {
      const complexTypes = Array.isArray(schema['xs:complexType']) 
        ? schema['xs:complexType'] 
        : [schema['xs:complexType']];
      
      result.complexTypes = this.arrayToObject(complexTypes, 'name');
    }

    // Обработка simple types как объекта
    if (schema['xs:simpleType']) {
      const simpleTypes = Array.isArray(schema['xs:simpleType']) 
        ? schema['xs:simpleType'] 
        : [schema['xs:simpleType']];
      
      result.simpleTypes = this.arrayToObject(simpleTypes, 'name');
    }

    return result;
  }

  private arrayToObject(array: any[], keyField: string): { [key: string]: any } {
    const obj: { [key: string]: any } = {};
    array.forEach((item, index) => {
      const key = item['@_' + keyField] || item[keyField] || `item_${index}`;
      obj[key] = this.processElement(item);
    });
    return obj;
  }

  private processElement(element: any): any {
    const processedElement: any = {
      name: element['@_name'],
      type: element['@_type'],
      minOccurs: element['@_minOccurs'],
      maxOccurs: element['@_maxOccurs']
    };

    // Обработка аннотации
    if (element['xs:annotation']) {
      processedElement.annotation = this.processAnnotation(element['xs:annotation']);
    }

    // Обработка complexType внутри элемента
    if (element['xs:complexType']) {
      processedElement.complexType = this.processComplexType(element['xs:complexType']);
    }

    // Обработка simpleType внутри элемента
    if (element['xs:simpleType']) {
      processedElement.simpleType = this.processSimpleType(element['xs:simpleType']);
    }

    return processedElement;
  }

  private processComplexType(complexType: any): any {
    const processedComplexType: any = {
      name: complexType['@_name']
    };

    // Обработка аннотации
    if (complexType['xs:annotation']) {
      processedComplexType.annotation = this.processAnnotation(complexType['xs:annotation']);
    }

    // Обработка sequence как объекта
    if (complexType['xs:sequence']) {
      processedComplexType.sequence = this.processSequence(complexType['xs:sequence']);
    }

    // Обработка all как объекта
    if (complexType['xs:all']) {
      processedComplexType.all = this.processAll(complexType['xs:all']);
    }

    // Обработка choice
    if (complexType['xs:choice']) {
      processedComplexType.choice = this.processChoice(complexType['xs:choice']);
    }

    // Обработка attributes как объекта
    if (complexType['xs:attribute']) {
      const attributes = Array.isArray(complexType['xs:attribute']) 
        ? complexType['xs:attribute'] 
        : [complexType['xs:attribute']];
      
      processedComplexType.attributes = this.arrayToObject(attributes, 'name');
    }

    // Обработка complexContent
    if (complexType['xs:complexContent']) {
      processedComplexType.complexContent = this.processComplexContent(complexType['xs:complexContent']);
    }

    return processedComplexType;
  }

  private processSimpleType(simpleType: any): any {
    const processedSimpleType: any = {
      name: simpleType['@_name']
    };

    if (simpleType['xs:restriction']) {
      const restriction = simpleType['xs:restriction'];
      processedSimpleType.restriction = {
        base: restriction['@_base']
      };

      // Обработка перечислений
      if (restriction['xs:enumeration']) {
        const enumerations = Array.isArray(restriction['xs:enumeration']) 
          ? restriction['xs:enumeration'] 
          : [restriction['xs:enumeration']];
        
        processedSimpleType.restriction.enumerations = enumerations.map((enumItem: any) => 
          this.processEnumeration(enumItem)
        );
      }

      // Обработка паттерна
      if (restriction['xs:pattern']) {
        processedSimpleType.restriction.pattern = restriction['xs:pattern']['@_value'];
      }
    }

    return processedSimpleType;
  }

  private processEnumeration(enumItem: any): XSDEnumeration {
    const enumeration: XSDEnumeration = {
      value: enumItem['@_value']
    };

    // Обработка аннотации для перечисления
    if (enumItem['xs:annotation']) {
      enumeration.annotation = this.processAnnotation(enumItem['xs:annotation']);
    }

    return enumeration;
  }

  private processSequence(sequence: any): { [key: string]: XSDElement } {
    if (!sequence['xs:element']) return {};
    
    const elements = Array.isArray(sequence['xs:element']) 
      ? sequence['xs:element'] 
      : [sequence['xs:element']];
    
    return this.arrayToObject(elements, 'name');
  }

  private processAll(all: any): { [key: string]: XSDElement } {
    if (!all['xs:element']) return {};
    
    const elements = Array.isArray(all['xs:element']) 
      ? all['xs:element'] 
      : [all['xs:element']];
    
    return this.arrayToObject(elements, 'name');
  }

  private processChoice(choice: any): any {
    const processedChoice: any = {
      elements: {}
    };

    if (choice['xs:element']) {
      const elements = Array.isArray(choice['xs:element']) 
        ? choice['xs:element'] 
        : [choice['xs:element']];
      
      processedChoice.elements = this.arrayToObject(elements, 'name');
    }

    return processedChoice;
  }

  private processComplexContent(complexContent: any): any {
    if (complexContent['xs:extension']) {
      const extension = complexContent['xs:extension'];
      const processedExtension: any = {
        base: extension['@_base']
      };

      // Обработка атрибутов в extension
      if (extension['xs:attribute']) {
        const attributes = Array.isArray(extension['xs:attribute']) 
          ? extension['xs:attribute'] 
          : [extension['xs:attribute']];
        
        processedExtension.attributes = this.arrayToObject(attributes, 'name');
      }

      return {
        extension: processedExtension
      };
    }

    return {};
  }

  private processAnnotation(annotation: any): XSDAnnotation {
    const processedAnnotation: XSDAnnotation = {
      documentation: ''
    };

    if (annotation['xs:documentation']) {
      const documentation = annotation['xs:documentation'];
      
      // Обработка текста документации
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

// Упрощенная версия для быстрого использования с полным извлечением документации
function parseXSDWithDocumentation(xsdContent: string): any {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    trimValues: true,
    alwaysCreateTextNode: true,
    preserveOrder: false,
    processEntities: true,
    htmlEntities: true,
    isArray: (name) => {
      const arrayElements = [
        'xs:element', 'xs:complexType', 'xs:simpleType', 
        'xs:attribute', 'xs:enumeration', 'xs:sequence',
        'xs:choice', 'xs:all'
      ];
      return arrayElements.includes(name);
    }
  });

  const result = parser.parse(xsdContent);
  
  // Дополнительная обработка для извлечения документации
  return extractDocumentationRecursively(result);
}

// Рекурсивная функция для извлечения документации из всей структуры
function extractDocumentationRecursively(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => extractDocumentationRecursively(item));
  } else if (obj && typeof obj === 'object') {
    const result: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'xs:annotation' && value && typeof value === 'object') {
        result.annotation = extractDocumentation(value);
      } else if (key === 'xs:documentation') {
        result.documentation = extractDocumentationText(value);
      } else {
        result[key] = extractDocumentationRecursively(value);
      }
    }
    
    return result;
  }
  
  return obj;
}

function extractDocumentation(annotation: any): string {
  if (!annotation) return '';
  
  if (annotation['xs:documentation']) {
    return extractDocumentationText(annotation['xs:documentation']);
  }
  
  return '';
}

function extractDocumentationText(doc: any): string {
  if (typeof doc === 'string') {
    return doc;
  } else if (doc && doc['#text']) {
    return doc['#text'];
  } else if (doc && typeof doc === 'object') {
    return doc['#text'] || doc['@_text'] || doc.text || JSON.stringify(doc);
  }
  
  return '';
}

// Экспорт всех функций и классов
export { 
  XSDParser, 
  parseXSDWithDocumentation, 
  extractDocumentationRecursively 
};