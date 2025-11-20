import type { FormField, LayerFields } from '../types';

export class LayerFilter {
  public filterFieldsForUI(fields: FormField[]): FormField[] {
    if (!Array.isArray(fields)) return [];

    return fields.filter(
      (field: FormField) =>
        field.layer === 'MDATA' ||
        //   field.layer === 'DMODEL' ||
        (field.layer === 'VIEW' && field.category === 'TextView')
    );
  }

  public groupFieldsByLayer(fields: FormField[]): LayerFields {
    const grouped: LayerFields = {
      MDATA: [],
      VIEW: [],
      DMODEL: [],
      OTHER: [],
    };

    fields.forEach((field: FormField) => {
      if (field.layer === 'MDATA') {
        grouped.MDATA.push(field);
      } else if (field.layer === 'VIEW') {
        grouped.VIEW.push(field);
      } else if (field.layer === 'DMODEL') {
        grouped.DMODEL.push(field);
      } else {
        grouped.OTHER.push(field);
      }
    });

    return grouped;
  }

  public getFieldsByLayer(fields: FormField[], layer: string): FormField[] {
    const grouped = this.groupFieldsByLayer(fields);
    return grouped[layer as keyof LayerFields] || [];
  }

  public getCategoriesByLayer(fields: FormField[], layer: string): string[] {
    const layerFields = this.getFieldsByLayer(fields, layer);
    const categories = new Set<string>();

    layerFields.forEach((field) => {
      categories.add(field.category);
    });

    return Array.from(categories);
  }

  public getFieldsByLayerAndCategory(
    fields: FormField[],
    layer: string,
    category: string
  ): FormField[] {
    const layerFields = this.getFieldsByLayer(fields, layer);
    return layerFields.filter((field) => field.category === category);
  }

  public getAllLayers(): string[] {
    return ['MDATA', 'VIEW', /* 'DMODEL', */ 'OTHER'];
  }

  public getLayerDisplayName(layer: string): string {
    const displayNames: { [key: string]: string } = {
      MDATA: 'Metadata',
      VIEW: 'View',
      DMODEL: 'Data Model',
      OTHER: 'Other',
    };

    return displayNames[layer] || layer;
  }

  public getCategoryDisplayName(category: string): string {
    const displayNames: { [key: string]: string } = {
      DocMetadata: 'Document Metadata',
      ReqMetadata: 'Requirements Metadata',
      Entities: 'Entities',
      Relations: 'Relations',
      Constraints: 'Constraints',
      Properties: 'Properties',
      TextView: 'Text View',
      GraphView: 'Graph View',
      TableView: 'Table View',
      FormulasView: 'Formulas View',
      GENERAL: 'General',
    };

    return displayNames[category] || category;
  }

  // Новый метод для получения основных элементов (не свойств)
  public getMainElements(fields: FormField[]): FormField[] {
    return fields.filter(
      (field) =>
        !field.name.includes('.') &&
        field.category !== 'Properties' &&
        field.type !== 'string'
    );
  }

  // Метод для получения свойств элементов
  public getElementProperties(
    fields: FormField[]
  ): FormField[] {
    return fields.filter(
      (field) =>
        field.name.includes('.') ||
        (field.category === 'Properties' && field.layer !== 'DMODEL')
    );
  }
}
