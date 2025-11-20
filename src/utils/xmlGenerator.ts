import * as xmlbuilder from 'xmlbuilder';
import type { FormField, FormData, XMLGenerationResult } from '../types';

export class XMLGenerator {
  public generateXML(
    formData: FormData,
    fields: FormField[]
  ): XMLGenerationResult {
    try {
      if (!formData || Object.keys(formData).length === 0) {
        return {
          success: false,
          xml: '',
          error: 'No form data provided',
        };
      }

      if (!fields || fields.length === 0) {
        return {
          success: false,
          xml: '',
          error: 'No fields provided',
        };
      }

      // Создаем корневой элемент
      const root = xmlbuilder.create('root', {
        version: '1.0',
        encoding: 'UTF-8',
      });

      // Группировка полей по слоям
      const layers: Map<string, FormField[]> = new Map();

      fields.forEach((field: FormField) => {
        const layerFields = layers.get(field.layer) || [];
        layerFields.push(field);
        layers.set(field.layer, layerFields);
      });

      // Создание XML структуры
      layers.forEach((layerFields: FormField[], layerName: string) => {
        if (layerFields.length > 0) {
          const layerElement = root.ele(layerName.toLowerCase());

          layerFields.forEach((field: FormField) => {
            const value = formData[field.name];
            if (value !== undefined && value !== null && value !== '') {
              const stringValue = String(value);
              if (stringValue) {
                layerElement.ele(field.name, {}, stringValue);
              }
            }
          });
        }
      });

      const xmlString = root.end({ pretty: true });

      return {
        success: true,
        xml: xmlString,
      };
    } catch (error) {
      return {
        success: false,
        xml: '',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown XML generation error',
      };
    }
  }

  public downloadXML(
    xmlContent: string,
    filename: string = 'form-data.xml'
  ): void {
    if (!xmlContent) {
      console.error('No XML content to download');
      return;
    }

    // Создаем Blob с XML содержимым
    const blob = new Blob([xmlContent], { type: 'application/xml' });

    // Создаем URL для Blob
    const url = URL.createObjectURL(blob);

    // Создаем временную ссылку для скачивания
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Добавляем ссылку в DOM, кликаем и удаляем
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Освобождаем URL
    URL.revokeObjectURL(url);
  }
}
