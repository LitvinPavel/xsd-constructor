import * as xmlbuilder from 'xmlbuilder';

import type { XSDSchema } from '../types';

export class XMLGenerator {
  static generateXML(
    formData: Record<string, any>,
    schema: XSDSchema | null,
    rootElementName: string = 'Requirement'
  ): string {
    const xml = xmlbuilder.create(rootElementName, {
      version: '1.0',
      encoding: 'UTF-8',
    });

    this.buildXML(xml, formData, schema);

    return xml.end({ pretty: true });
  }

  private static buildXML(
    xml: any,
    data: Record<string, any>,
    schema: XSDSchema | null,
    parentElementName: string = ''
  ): void {
    for (const [key, value] of Object.entries(data)) {
      // Пропускаем пустые значения
      if (this.isEmptyValue(value)) {
        continue;
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Вложенный объект - создаем элемент и рекурсивно обрабатываем
        const child = xml.ele(key);

        // Добавляем атрибуты если есть в схеме
        this.addAttributes(child, key, schema, parentElementName);

        this.buildXML(child, value, schema, key);
      } else if (Array.isArray(value)) {
        // Массив - создаем элементы для каждого непустого значения
        value.forEach((item) => {
          if (!this.isEmptyValue(item)) {
            if (typeof item === 'object') {
              const child = xml.ele(key);
              this.addAttributes(child, key, schema, parentElementName);
              this.buildXML(child, item, schema, key);
            } else {
              const child = xml.ele(key, item.toString());
              this.addAttributes(child, key, schema, parentElementName);
            }
          }
        });
      } else {
        // Простое значение - создаем элемент с текстом
        const child = xml.ele(key, value.toString());
        this.addAttributes(child, key, schema, parentElementName);
      }
    }
  }

  private static addAttributes(
    xmlElement: any,
    elementName: string,
    schema: XSDSchema | null,
    parentElementName: string = ''
  ): void {
    if (!schema) return;

    // Ищем элемент в схеме
    const element = this.findElementInSchema(
      elementName,
      parentElementName,
      schema
    );
    if (!element || !element.complexType?.attributes) return;

    // Добавляем атрибуты из схемы
    element.complexType.attributes.forEach((attr: { use: string; name: any; }) => {
      // Для обязательных атрибутов добавляем значения по умолчанию
      if (attr.use === 'required') {
        const defaultValue = this.getDefaultAttributeValue(attr);
        if (defaultValue !== null) {
          xmlElement.att(attr.name, defaultValue);
        }
      }
      // Для необязательных атрибутов можно добавить логику если нужно
    });
  }

  private static findElementInSchema(
    elementName: string,
    parentElementName: string,
    schema: XSDSchema
  ): any {
    // Сначала ищем в корневых элементах
    let element = schema.elements.find((el) => el.name === elementName);
    if (element) return element;

    // Ищем во вложенных complexType
    if (parentElementName) {
      const parentElement = schema.elements.find(
        (el) => el.name === parentElementName
      );
      if (parentElement?.complexType?.sequence) {
        element = parentElement.complexType.sequence.find(
          (el) => el.name === elementName
        );
      }
      if (parentElement?.complexType?.all) {
        element = parentElement.complexType.all.find(
          (el) => el.name === elementName
        );
      }
    }

    // Ищем в complexTypes
    if (!element) {
      for (const complexType of schema.complexTypes) {
        if (complexType.sequence) {
          element = complexType.sequence.find((el) => el.name === elementName);
          if (element) break;
        }
        if (complexType.all) {
          element = complexType.all.find((el) => el.name === elementName);
          if (element) break;
        }
      }
    }

    return element;
  }

  private static getDefaultAttributeValue(attribute: any): string | null | undefined {
    if (attribute.simpleType?.restriction?.enumerations) {
      return attribute.simpleType.restriction.enumerations[0]?.value || null;
    }

    switch (attribute.type) {
      case 'xs:string':
        return '';
      case 'xs:integer':
      case 'xs:decimal':
        return '0';
      case 'xs:boolean':
        return 'false';
      case 'xs:date':
        return new Date().toISOString().split('T')[0];
      default:
        return null;
    }
  }

  private static isEmptyValue(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (typeof value === 'number' && isNaN(value)) return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0)
      return true;
    return false;
  }

  static downloadXML(
    xmlContent: string,
    filename: string = 'generated.xml'
  ): void {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
