import { XMLParser } from 'fast-xml-parser';
import type {
  FormField,
  ParsingResult,
  XSDRoot,
  XSDElement,
  XSDSimpleType,
  XSDEnumeration,
  XSDComplexType,
} from '../types';

export class XSDParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true,
      allowBooleanAttributes: false,
      parseTagValue: false,
    });
  }

  private parseXSDType(xsdType: string): FormField['type'] {
    const typeMap: Map<string, FormField['type']> = new Map([
      ['xs:string', 'string'],
      ['xs:integer', 'number'],
      ['xs:decimal', 'number'],
      ['xs:boolean', 'boolean'],
      ['xs:date', 'date'],
      ['string', 'string'],
      ['integer', 'number'],
      ['decimal', 'number'],
      ['boolean', 'boolean'],
      ['date', 'date'],
      // Специфические типы из схемы
      ['KSIdentification', 'string'],
      ['RegElement', 'object'],
      ['GraphElement', 'graph'],
      ['TableElement', 'table'],
      ['FormulaElement', 'formula'],
      ['Entity', 'object'],
      ['Property', 'object'],
      ['Relation', 'object'],
      ['Constraint', 'object'],
    ]);

    return typeMap.get(xsdType) || 'string';
  }

  private extractDocumentation(element: XSDElement): string {
    const annotation = element['xs:annotation'];
    if (!annotation) return '';

    const documentation = annotation['xs:documentation'];
    if (typeof documentation === 'string') {
      return documentation;
    } else if (
      documentation &&
      typeof documentation === 'object' &&
      '#text' in documentation
    ) {
      return documentation['#text'] || '';
    }

    return '';
  }

  private parseSimpleType(simpleType: XSDSimpleType): {
    type: FormField['type'];
    options?: string[];
  } {
    const restriction = simpleType['xs:restriction'];
    if (!restriction) return { type: 'string' };

    const enumeration = restriction['xs:enumeration'];
    if (!enumeration) return { type: 'string' };

    let options: string[] = [];

    if (Array.isArray(enumeration)) {
      options = enumeration
        .map((enumItem: XSDEnumeration) => enumItem['@_value'])
        .filter(Boolean);
    } else if (
      enumeration &&
      typeof enumeration === 'object' &&
      '@_value' in enumeration
    ) {
      options = [enumeration['@_value']];
    }

    return {
      type: options.length > 0 ? 'choice' : 'string',
      options: options.length > 0 ? options : undefined,
    };
  }

  private detectLayer(elementName: string, elementType: string): string {
    const name = elementName.toLowerCase();
    const type = elementType.toLowerCase();

    if (
      name.includes('mdata') ||
      type.includes('mdata') ||
      name.includes('doc') ||
      name.includes('req') ||
      name.includes('metadata')
    ) {
      return 'MDATA';
    }

    if (
      name.includes('dmodel') ||
      type.includes('dmodel') ||
      name.includes('entity') ||
      name.includes('relation') ||
      name.includes('constraint') ||
      name.includes('property')
    ) {
      return 'DMODEL';
    }

    if (
      name.includes('view') ||
      type.includes('view') ||
      name.includes('text') ||
      name.includes('graph') ||
      name.includes('table') ||
      name.includes('formula') ||
      name.includes('element')
    ) {
      return 'VIEW';
    }

    return 'OTHER';
  }

  private detectCategory(elementName: string, elementType: string): string {
    const name = elementName.toLowerCase();
    const type = elementType.toLowerCase();

    // MDATA категории
    if (name.includes('doc') || type.includes('doc')) return 'DocMetadata';
    if (name.includes('req') || type.includes('req')) return 'ReqMetadata';

    // DMODEL категории
    if (name.includes('entity') || type.includes('entity')) return 'Entities';
    if (name.includes('relation') || type.includes('relation'))
      return 'Relations';
    if (name.includes('constraint') || type.includes('constraint'))
      return 'Constraints';
    if (name.includes('property') || type.includes('property'))
      return 'Properties';

    // VIEW категории
    if (name.includes('text') || type.includes('text')) return 'TextView';
    if (name.includes('graph') || type.includes('graph')) return 'GraphView';
    if (name.includes('table') || type.includes('table')) return 'TableView';
    if (name.includes('formula') || type.includes('formula'))
      return 'FormulasView';

    return 'GENERAL';
  }

  private isFieldEditable(
    fieldType: FormField['type'],
    category: string
  ): boolean {
    // Всегда редактируемы строковые поля
    if (fieldType === 'string') return true;

    // Проверяем категории, где разрешены нестроковые типы
    switch (category) {
      case 'DocMetadata':
      case 'ReqMetadata':
        // В MDATA редактируемы все типы
        return true;

      case 'TextView':
        // В TextView редактируемы только строковые поля (уже обработано выше)
        return false;

      case 'Properties':
        // В Properties редактируемы только строковые поля (уже обработано выше)
        return false;

      default:
        // Все остальные случаи - не редактируемы
        return false;
    }
  }

  private extractAttributesFromComplexType(
    complexType: XSDComplexType
  ): FormField[] {
    const fields: FormField[] = [];

    // Обработка sequence элементов
    const sequence = complexType['xs:sequence'];
    if (sequence && sequence['xs:element']) {
      const elements = Array.isArray(sequence['xs:element'])
        ? sequence['xs:element']
        : [sequence['xs:element']];

      elements.forEach((element: XSDElement) => {
        const name = element['@_name'];
        const type = element['@_type'];

        if (name && type) {
          const fieldType = this.parseXSDType(type);
          const documentation = this.extractDocumentation(element);
          const minOccurs = element['@_minOccurs'];

          fields.push({
            name,
            type: fieldType,
            label: name,
            required: minOccurs === '1',
            documentation,
            layer: 'DMODEL',
            category: 'Properties',
            editable: this.isFieldEditable(fieldType, 'Properties'),
          });
        }
      });
    }

    return fields;
  }

  private processComplexElement(
    element: XSDElement,
    fields: FormField[]
  ): void {
    const name = element['@_name'];
    const type = element['@_type'];

    if (!name) return;

    const documentation = this.extractDocumentation(element);
    const layer = this.detectLayer(name, type || '');
    const category = this.detectCategory(name, type || '');

    // Определяем тип элемента
    let fieldType: FormField['type'] = 'string';
    if (type) {
      fieldType = this.parseXSDType(type);
    } else if (element['xs:complexType']) {
      // Если это сложный тип без явного type, анализируем содержимое
      element['xs:complexType'];
      if (name.includes('Graph') || name.includes('TagDocument')) {
        fieldType = 'graph';
      } else if (name.includes('Table')) {
        fieldType = 'table';
      } else if (name.includes('Formula')) {
        fieldType = 'formula';
      } else if (
        name.includes('Entity') ||
        name.includes('Relation') ||
        name.includes('Constraint')
      ) {
        fieldType = 'object';
      }
    }

    const editable = this.isFieldEditable(fieldType, category);

    // Добавляем основной элемент
    fields.push({
      name,
      type: fieldType,
      label: name,
      required: false,
      documentation,
      layer,
      category,
      editable,
    });

    // Обрабатываем вложенные элементы сложного типа
    const complexType = element['xs:complexType'];
    if (complexType) {
      const nestedFields = this.extractAttributesFromComplexType(complexType);
      fields.push(...nestedFields);
    }

    // Рекурсивная обработка вложенных элементов
    const sequence = complexType?.['xs:sequence'];
    const childElement = sequence?.['xs:element'];

    if (childElement) {
      const children: XSDElement[] = Array.isArray(childElement)
        ? childElement
        : [childElement];
      children.forEach((child: XSDElement) =>
        this.processComplexElement(child, fields)
      );
    }
  }

  private processElement(element: XSDElement, fields: FormField[]): void {
    const name = element['@_name'];
    const type = element['@_type'];

    if (!name) return;

    // Пропускаем элементы с расширениями (extension)
    const complexType = element['xs:complexType'];
    if (complexType && complexType['xs:complexContent']?.['xs:extension']) {
      // Это расширение типа, обрабатываем как сложный элемент
      this.processComplexElement(element, fields);
      return;
    }

    const minOccurs = element['@_minOccurs'];
    const documentation = this.extractDocumentation(element);
    const layer = this.detectLayer(name, type || '');
    const category = this.detectCategory(name, type || '');

    const baseField: Omit<FormField, 'type' | 'options' | 'editable'> = {
      name,
      label: name,
      required: minOccurs === '1',
      documentation,
      layer,
      category,
    };

    // Обработка простых типов с перечислениями
    const simpleType = element['xs:simpleType'];
    if (simpleType) {
      const simpleTypeInfo = this.parseSimpleType(simpleType);
      const fieldType = simpleTypeInfo.type;
      const editable = this.isFieldEditable(fieldType, category);

      fields.push({
        ...baseField,
        type: fieldType,
        options: simpleTypeInfo.options,
        editable,
      } as FormField);
    } else {
      // Обычный тип
      const fieldType = type ? this.parseXSDType(type) : 'string';
      const editable = this.isFieldEditable(fieldType, category);

      fields.push({
        ...baseField,
        type: fieldType,
        editable,
      } as FormField);
    }

    // Рекурсивная обработка вложенных элементов
    if (complexType) {
      const sequence = complexType['xs:sequence'];
      const childElement = sequence?.['xs:element'];

      if (childElement) {
        const children: XSDElement[] = Array.isArray(childElement)
          ? childElement
          : [childElement];
        children.forEach((child: XSDElement) =>
          this.processElement(child, fields)
        );
      }
    }
  }

  public parseXSD(xsdContent: string): ParsingResult {
    try {
      const parsed: XSDRoot = this.parser.parse(xsdContent);

      const fields: FormField[] = [];
      const schema = parsed['xs:schema'];

      if (!schema) {
        return {
          success: false,
          fields: [],
          error: 'No schema found in XSD',
        };
      }

      const elements = schema['xs:element'];
      if (!elements) {
        return {
          success: false,
          fields: [],
          error: 'No elements found in schema',
        };
      }

      const elementArray: XSDElement[] = Array.isArray(elements)
        ? elements
        : [elements];

      elementArray.forEach((element: XSDElement) => {
        this.processElement(element, fields);
      });

      return {
        success: true,
        fields,
      };
    } catch (error) {
      return {
        success: false,
        fields: [],
        error: error instanceof Error ? error.message : 'Unknown parsing error',
      };
    }
  }
}
