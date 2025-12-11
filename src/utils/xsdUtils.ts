export const COMPLEX_TYPES = ['KSIIdentification', 'Condition', 'Organization', 'Link'];
export const REMOVABLE_ITEMS = ['Entity', 'Property', 'Relation', 'LogicalUnit'];
export const KSI_IDENTIFICATION_FIELDS = ['EntityID', 'PropertyID'];
export const ENTITIES_OR_PROPERTIES_OR_RELATIONS = ['Entities', 'Properties', 'Relations', 'LogicalUnits'];

export function isComplexType(type?: string): boolean {
  return type ? COMPLEX_TYPES.includes(type) : false;
}

export function canRemoveItem(itemName: string): boolean {
  return REMOVABLE_ITEMS.includes(itemName);
}

export function isKSIIdentificationField(item: any): boolean {
  return KSI_IDENTIFICATION_FIELDS.includes(item.name);
}

export function decodeHTMLEntities(text: string) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(
        `<!DOCTYPE html><body>${text}</body>`,
        'text/html'
    );
    return dom.body.textContent;
}

export function getInputType(xsdType?: string): string {
  if (!xsdType) return 'text';

  const typeMap: { [key: string]: string } = {
    'xs:string': 'text',
    'xs:integer': 'number',
    'xs:decimal': 'number',
    'xs:float': 'number',
    'xs:double': 'number',
    'xs:boolean': 'checkbox',
    'xs:date': 'date',
    'xs:dateTime': 'datetime-local',
    'xs:time': 'time',
  };

  return typeMap[xsdType] || 'text';
}

export function generateDefaultUid(elementName: string): string {
  const prefixMap: { [key: string]: string } = {
    'GraphElement': 'Graph',
    'TableElement': 'Table',
    'FormulaElement': 'Formula'
  };
  
  const prefix = prefixMap[elementName] || elementName;
  return `${prefix}${Math.floor(Math.random() * 1000)}`;
}

export function getReqElementType(elementName: string): string {
  const typeMap: { [key: string]: string } = {
    'GraphElement': 'графическое изображение',
    'TableElement': 'таблица',
    'FormulaElement': 'формульная запись'
  };
  return typeMap[elementName] || '';
}

export function isReqElementExtension(element: any): boolean {
  return element.complexType?.complexContent?.extension?.base === 'ReqElement';
}

export function deepCopyElement(element: any): any {
  if (element === null || typeof element !== 'object') {
    return element;
  }

  if (Array.isArray(element)) {
    return element.map((item) => deepCopyElement(item));
  }

  const copy: any = {};
  for (const key in element) {
    if (element.hasOwnProperty(key)) {
      copy[key] = deepCopyElement(element[key]);
    }
  }
  return copy;
}

export function clearElementValues(element: any): void {
  if (!element || typeof element !== 'object') return;

  if ('value' in element) {
    element.value = '';
  }

  if (element.complexType?.sequence) {
    Object.values(element.complexType.sequence).forEach((child: any) =>
      clearElementValues(child)
    );
  }

  if (element.complexType?.all) {
    Object.values(element.complexType.all).forEach((child: any) =>
      clearElementValues(child)
    );
  }

  if (element.complexType?.choice?.elements) {
    Object.values(element.complexType.choice.elements).forEach((child: any) =>
      clearElementValues(child)
    );
  }

  if (element.complexType?.complexContent?.extension?.sequence) {
    Object.values(element.complexType.complexContent.extension.sequence).forEach((child: any) =>
      clearElementValues(child)
    );
  }
}

export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null) return undefined;
    
    if (current.complexType?.sequence?.[key]) {
      current = current.complexType.sequence[key];
    } else if (current.complexType?.all?.[key]) {
      current = current.complexType.all[key];
    } else if (current.complexType?.complexContent?.extension?.sequence?.[key]) {
      current = current.complexType.complexContent.extension.sequence[key];
    } else if (current.complexType?.choice?.elements?.[key]) {
      current = current.complexType.choice.elements[key];
    } else if (current[key] !== undefined) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}
