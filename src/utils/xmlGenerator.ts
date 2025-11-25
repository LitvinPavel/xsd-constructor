import * as builder from 'xmlbuilder';

interface XSDElement {
  name: string;
  type?: string;
  value?: any;
  complexType?: {
    sequence?: { [key: string]: XSDElement };
    all?: { [key: string]: XSDElement };
    choice?: {
      elements: { [key: string]: XSDElement };
    };
    attributes?: { [key: string]: any };
  };
  simpleType?: any;
}

interface XSDSchema {
  elements: { [key: string]: XSDElement };
}

// Основная функция генерации XML
export function generateXMLFromSchema(schema: XSDSchema): string {
  if (!schema.elements || Object.keys(schema.elements).length === 0) {
    throw new Error('No elements found in schema');
  }

  // Предполагаем, что корневой элемент - первый в объекте
  const rootElementKey = Object.keys(schema.elements)[0];
  const rootElement = schema.elements[rootElementKey as string];

  if (!rootElement) {
    throw new Error('Root element is undefined');
  }

  // Создаем корневой элемент XML
  const xml = builder.create(rootElement.name, {
    version: '1.0',
    encoding: 'UTF-8',
  });

  // Рекурсивно добавляем дочерние элементы
  processElement(xml, rootElement);

  return xml.end({ pretty: true, indent: '  ', newline: '\n' });
}

// Рекурсивная обработка элемента
function processElement(parent: any, element: XSDElement): void {
  // Если элемент имеет значение, добавляем его как текстовый узел
  if (
    element.value !== undefined &&
    element.value !== null &&
    element.value !== ''
  ) {
    parent.txt(element.value.toString());
    return;
  }

  // Обработка complexType с sequence
  if (element.complexType?.sequence) {
    for (const [_key, childElement] of Object.entries(element.complexType.sequence)) {
      if (childElement && childElement.name) {
        const childNode = parent.ele(childElement.name);
        processElement(childNode, childElement);
      }
    }
    return;
  }

  // Обработка complexType с all
  if (element.complexType?.all) {
    for (const [_key, childElement] of Object.entries(element.complexType.all)) {
      if (childElement && childElement.name) {
        const childNode = parent.ele(childElement.name);
        processElement(childNode, childElement);
      }
    }
    return;
  }

  // Обработка complexType с choice (берем первый элемент)
  if (
    element.complexType?.choice?.elements &&
    Object.keys(element.complexType.choice.elements).length > 0
  ) {
    const firstChoiceKey = Object.keys(element.complexType.choice.elements)[0];
    const firstChoiceElement = element.complexType.choice.elements[firstChoiceKey as string];
    if (firstChoiceElement && firstChoiceElement.name) {
      const choiceNode = parent.ele(firstChoiceElement.name);
      processElement(choiceNode, firstChoiceElement);
    }
    return;
  }

  // Если это простой элемент без детей, но без значения, добавляем пустой элемент
  if (!element.complexType && element.value === undefined) {
    parent.txt('');
  }
}

// Альтернативная функция с дополнительной валидацией
export function generateXMLWithValidation(schema: XSDSchema): string {
  // Проверяем наличие элементов
  if (
    !schema?.elements ||
    Object.keys(schema.elements).length === 0
  ) {
    throw new Error('Invalid schema: no elements found');
  }

  const rootElementKey = Object.keys(schema.elements)[0];
  const rootElement = schema.elements[rootElementKey as string];

  // Проверяем корневой элемент
  if (
    !rootElement ||
    !rootElement.name ||
    typeof rootElement.name !== 'string'
  ) {
    throw new Error('Invalid root element: name is required');
  }

  try {
    const xml = builder.create(rootElement.name, {
      version: '1.0',
      encoding: 'UTF-8',
    });

    // Обрабатываем корневой элемент и все его дочерние элементы
    processRootElement(xml, rootElement);

    return xml.end({ pretty: true, indent: '  ', newline: '\n' });
  } catch (error) {
    throw new Error(`XML generation failed: ${(error as Error).message}`);
  }
}

// Обработка корневого элемента и его структуры
function processRootElement(parent: any, rootElement: XSDElement): void {
  if (!rootElement.complexType?.sequence) {
    return;
  }

  // Обрабатываем все дочерние элементы корневого элемента
  for (const [_key, childElement] of Object.entries(rootElement.complexType.sequence)) {
    if (childElement?.name) {
      processElementWithValidation(parent, childElement);
    }
  }
}

function processElementWithValidation(parent: any, element: XSDElement): void {
  if (!element || !element.name) return;

  const currentNode = parent.ele(element.name);

  // Обработка complexType (должна быть ДО обработки текстового значения)
  if (element.complexType && element.value) {
    processComplexType(currentNode, element.complexType, element.value);
  } else if (element.type && isComplexType(element.type) && element.value) {
    // Если элемент имеет тип complexType и значение
    processComplexTypeByDefinition(currentNode, element.type, element.value);
  } else if (
    element.value !== undefined &&
    element.value !== null &&
    element.value !== '' &&
    !element.complexType &&
    !isComplexType(element.type)
  ) {
    currentNode.txt(String(element.value));
  }

  // Обработка choice в complexType
  if (element.complexType?.choice?.elements && element.value) {
    processChoiceElements(currentNode, element.complexType.choice.elements, element.value);
  }

  // Обработка атрибутов
  if (element.complexType?.attributes && element.value?.attributes) {
    for (const [attrKey, attrValue] of Object.entries(element.value.attributes)) {
      if (attrValue !== undefined && attrValue !== null && attrValue !== '') {
        currentNode.att(attrKey, String(attrValue));
      }
    }
  }

  // Рекурсивная обработка дочерних элементов
  if (element.complexType?.sequence) {
    for (const [_childKey, child] of Object.entries(element.complexType.sequence)) {
      processElementWithValidation(currentNode, child);
    }
  }

  if (element.complexType?.all) {
    for (const [_childKey, child] of Object.entries(element.complexType.all)) {
      processElementWithValidation(currentNode, child);
    }
  }

  if (element.complexType?.choice?.elements) {
    const firstChoiceKey = Object.keys(element.complexType.choice.elements)[0];
    const firstChoice = element.complexType.choice.elements[firstChoiceKey as string];
    if (firstChoice) {
      processElementWithValidation(currentNode, firstChoice);
    }
  }
}

// Новая функция для обработки choice элементов
function processChoiceElements(parent: any, choiceElements: { [key: string]: XSDElement }, complexValue: any): void {
  if (!complexValue || typeof complexValue !== 'object') return;

  // Ищем выбранный choice элемент
  for (const [choiceKey, choiceDef] of Object.entries(choiceElements)) {
    const choiceValue = complexValue[choiceKey];
    if (choiceValue !== undefined && choiceValue !== null && choiceValue !== '') {
      const choiceNode = parent.ele(choiceKey);
      
      // Обработка вложенного complexType в choice
      if (choiceDef.complexType && typeof choiceValue === 'object') {
        processComplexType(choiceNode, choiceDef.complexType, choiceValue);
      } else {
        choiceNode.txt(String(choiceValue));
      }
      break; // В choice выбирается только один элемент
    }
  }
}

// Новая функция для обработки complexType по определению
function processComplexTypeByDefinition(parent: any, typeName: string, complexValue: any): void {
  if (!complexValue || typeof complexValue !== 'object') return;

  console.log('Processing complex type by definition:', typeName, complexValue);

  // Обрабатываем основные поля (исключая атрибуты)
  for (const [key, value] of Object.entries(complexValue)) {
    if (key === 'attributes') continue;
    
    if (value !== undefined && value !== null && value !== '') {
      const fieldNode = parent.ele(key);
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Вложенный объект - рекурсивная обработка
        processComplexTypeValue(fieldNode, value);
      } else {
        // Простое значение
        fieldNode.txt(String(value));
      }
    }
  }

  // Обработка атрибутов
  if (complexValue.attributes) {
    for (const [attrKey, attrValue] of Object.entries(complexValue.attributes)) {
      if (attrValue !== undefined && attrValue !== null && attrValue !== '') {
        parent.att(attrKey, String(attrValue));
      }
    }
  }
}

// Новая функция для обработки complexType
function processComplexType(parent: any, complexType: any, complexValue: any): void {
  if (!complexValue || typeof complexValue !== 'object') return;

  // Обработка элементов из all
  if (complexType.all && complexValue) {
    for (const [key, fieldDef] of Object.entries(complexType.all)) {
      const fieldValue = complexValue[key];
      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        const fieldNode = parent.ele(key);
        
        // Если значение - объект (вложенный complexType), обрабатываем рекурсивно
        if (typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          processComplexTypeValue(fieldNode, fieldDef);
        } else {
          fieldNode.txt(String(fieldValue));
        }
      }
    }
  }

  // Обработка элементов из sequence
  if (complexType.sequence && complexValue) {
    for (const [key, fieldDef] of Object.entries(complexType.sequence)) {
      const fieldValue = complexValue[key];
      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        const fieldNode = parent.ele(key);
        
        // Если значение - объект (вложенный complexType), обрабатываем рекурсивно
        if (typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          processComplexTypeValue(fieldNode, fieldDef);
        } else {
          fieldNode.txt(String(fieldValue));
        }
      }
    }
  }

  // Обработка атрибутов complexType
  if (complexType.attributes && complexValue.attributes) {
    for (const [attrKey, attrValue] of Object.entries(complexValue.attributes)) {
      if (attrValue !== undefined && attrValue !== null && attrValue !== '') {
        parent.att(attrKey, String(attrValue));
      }
    }
  }
}

function processComplexTypeValue(parent: any, complexValue: any): void {
  if (!complexValue || typeof complexValue !== 'object') return;

  for (const [key, value] of Object.entries(complexValue)) {
    if (key === 'attributes') continue;
    
    if (value !== undefined && value !== null && value !== '') {
      const fieldNode = parent.ele(key);
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Рекурсивная обработка вложенных объектов
        processComplexTypeValue(fieldNode, value);
      } else {
        fieldNode.txt(String(value));
      }
    }
  }

  // Обработка атрибутов
  if (complexValue.attributes) {
    for (const [attrKey, attrValue] of Object.entries(complexValue.attributes)) {
      if (attrValue !== undefined && attrValue !== null && attrValue !== '') {
        parent.att(attrKey, String(attrValue));
      }
    }
  }
}

// Проверка, является ли тип complexType
function isComplexType(typeName?: string): boolean {
  if (!typeName) return false;
  const complexTypes = ['KSIIdentification', 'Condition', 'Organization', 'Link', 'ReqElement'];
  return complexTypes.includes(typeName);
}

// Функция для получения информации о схеме (для отладки)
export function getSchemaInfo(schema: XSDSchema): {
  elementCount: number;
  rootElementName?: string;
  hasComplexTypes: boolean;
} {
  if (!schema?.elements) {
    return { elementCount: 0, hasComplexTypes: false };
  }

  const rootElementKey = Object.keys(schema.elements)[0];
  const rootElement = schema.elements[rootElementKey as string];
  
  const hasComplexTypes = Object.values(schema.elements).some(
    (el) =>
      el.complexType?.sequence || el.complexType?.all || el.complexType?.choice
  );

  return {
    elementCount: Object.keys(schema.elements).length,
    rootElementName: rootElement?.name,
    hasComplexTypes,
  };
}