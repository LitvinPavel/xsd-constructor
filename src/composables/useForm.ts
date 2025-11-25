import { ref, reactive, nextTick } from 'vue';
import { XSDParser } from '../utils/xsdParser';
import {
  generateXMLWithValidation,
  getSchemaInfo,
} from '../utils/xmlGenerator';

interface XSDSchema {
  elements: { [key: string]: any };
  complexTypes: { [key: string]: any };
  simpleTypes: { [key: string]: any };
}

interface ComplexTypeInstance {
  type: string;
  data: any;
}

export function useForm() {
// Реактивные данные
const schema = reactive<XSDSchema>({
  elements: {},
  complexTypes: {},
  simpleTypes: {},
});

const generatedXML = ref<string>('');
const complexTypesStore = ref<ComplexTypeInstance[]>([]);

// Хранилище значений элементов
const elementValues = reactive<{ [path: string]: any }>({});

// Функция чтения файла
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) =>
      resolve((e.target?.result as string) || '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// Обработка загрузки файла
const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    try {
      const content = await readFileContent(file);
      parseXSD(content);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  }
};

// Парсинг XSD
const parseXSD = (xsdContent: string): void => {
  const parser = new XSDParser();
  const parsedSchema = parser.parseXSDToJSON(xsdContent);
  
  // Получаем структурированные определения complexTypes
  const complexTypeDefinitions = parser.getComplexTypeDefinitions(
    parser['parser'].parse(xsdContent) // Используем сырые данные парсера
  );

  // Очищаем предыдущие значения
  Object.keys(schema.elements).forEach(key => delete schema.elements[key]);
  Object.keys(schema.complexTypes).forEach(key => delete schema.complexTypes[key]);
  Object.keys(schema.simpleTypes).forEach(key => delete schema.simpleTypes[key]);
  Object.keys(elementValues).forEach(key => delete elementValues[key]);

  // Копируем новые данные
  Object.assign(schema, parsedSchema);
  
  // Добавляем структурированные complexTypes
  Object.assign(schema.complexTypes, complexTypeDefinitions);

  // Инициализируем значения для ВСЕХ элементов
  initializeElementValues(schema.elements);

  console.log('Parsed schema with complexTypes:', schema.complexTypes);
};

// Инициализация структуры значений элементов
const initializeElementValues = (
  elements: { [key: string]: any },
  parentPath: string = ''
) => {
  Object.entries(elements).forEach(([key, element]) => {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;

    // Инициализируем значение для простых элементов
    if (element.type || element.simpleType) {
      elementValues[currentPath] = element.value || '';
    }

    // Рекурсивно инициализируем для вложенных элементов
    if (element.complexType?.sequence) {
      initializeElementValues(element.complexType.sequence, currentPath);
    }
    if (element.complexType?.all) {
      initializeElementValues(element.complexType.all, currentPath);
    }
    if (element.complexType?.choice?.elements) {
      initializeElementValues(element.complexType.choice.elements, currentPath);
    }
  });
};

// Обновление значения элемента
const updateElementValue = (elementPath: string, value: any) => {
  console.log('Updating element value:', elementPath, value);

  // Если значение - complexType, сохраняем его полностью
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    // Проверяем, является ли это complexType
    const targetElement = findElementByPath(schema.elements, elementPath);
    if (targetElement && targetElement.type && isComplexType(targetElement.type)) {
      console.log('Saving complex type:', targetElement.type, value);
    }
  }

  // Сохраняем значение в хранилище
  elementValues[elementPath] = value;

  // Также обновляем значение в самом элементе schema
  updateSchemaElementValue(schema.elements, elementPath, value);
};

// Добавим функцию проверки complexType
const isComplexType = (typeName: string): boolean => {
  const complexTypes = ['KSIIdentification', 'Condition', 'Organization', 'Link', 'ReqElement'];
  return complexTypes.includes(typeName);
};

// Обновим функцию синхронизации значений
const syncValuesToSchema = () => {
  Object.entries(elementValues).forEach(([path, value]) => {
    // Если значение - complexType объект, сохраняем его как есть
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const targetElement = findElementByPath(schema.elements, path);
      if (targetElement && targetElement.type && isComplexType(targetElement.type)) {
        // Для complexType сохраняем объект полностью
        updateSchemaElementValue(schema.elements, path, value);
        return;
      }
    }
    
    // Для обычных значений используем стандартную логику
    updateSchemaElementValue(schema.elements, path, value);
  });
};

// Рекурсивное обновление значения в структуре schema
const updateSchemaElementValue = (
  elements: { [key: string]: any },
  path: string,
  value: any
): boolean => {
  const pathParts = path.split('.');
  const currentKey = pathParts[0] as string;
  const remainingPath = pathParts.slice(1).join('.');

  if (elements[currentKey]) {
    if (remainingPath === '') {
      // Нашли целевой элемент - обновляем значение
      elements[currentKey].value = value;
      return true;
    } else {
      // Продолжаем поиск во вложенных элементах
      const element = elements[currentKey];

      if (element.complexType?.sequence) {
        return updateSchemaElementValue(
          element.complexType.sequence,
          remainingPath,
          value
        );
      }
      if (element.complexType?.all) {
        return updateSchemaElementValue(
          element.complexType.all,
          remainingPath,
          value
        );
      }
      if (element.complexType?.choice?.elements) {
        return updateSchemaElementValue(
          element.complexType.choice.elements,
          remainingPath,
          value
        );
      }
    }
  }
  return false;
};

// Добавление нового Entity, Relation или Property
const handleAddItem = async (
  elementPath: string,
  itemType: 'Entity' | 'Relation' | 'Property'
) => {
  await nextTick();

  console.log(`Adding new ${itemType} at path: ${elementPath}`);

  const targetElement = findElementByPath(schema.elements, elementPath);

  if (targetElement && targetElement.complexType?.sequence) {
    console.log('Found target element:', targetElement);

    // Используем первый элемент как шаблон
    const templateKey = Object.keys(targetElement.complexType.sequence)[0] as string;
    const templateElement = targetElement.complexType.sequence[templateKey];

    if (templateElement && templateElement.name === itemType) {
      console.log('Found template element:', templateElement);

      const newItem = deepCopyElement(templateElement);
      clearElementValues(newItem);
      generateUniqueIds(newItem, itemType);

      // Генерируем уникальный ключ для нового элемента
      const newKey = `${itemType}_${Date.now()}`;
      
      // Добавляем новый элемент в sequence
      targetElement.complexType.sequence[newKey] = newItem;

      // Инициализируем значения для нового элемента
      initializeElementValues({ [newKey]: newItem }, elementPath);

      console.log(`Added new ${itemType}:`, newItem);
      console.log('Current sequence:', targetElement.complexType.sequence);
    } else {
      console.error(
        `Template element ${itemType} not found in sequence:`,
        templateElement
      );
    }
  } else {
    console.error(
      'Target element not found or has no sequence for path:',
      elementPath
    );
  }
};

// Поиск элемента по пути
const findElementByPath = (
  elements: { [key: string]: any },
  path: string
): any | null => {
  const pathParts = path.split('.');
  
  const findInElements = (
    currentElements: { [key: string]: any },
    parts: string[]
  ): any | null => {
    if (parts.length === 0) return null;

    const currentPart = parts[0] as string;
    const remainingParts = parts.slice(1);

    if (currentElements[currentPart]) {
      const element = currentElements[currentPart];
      
      if (remainingParts.length === 0) {
        return element;
      }

      // Продолжаем поиск в дочерних элементах
      if (element.complexType?.sequence) {
        const found = findInElements(element.complexType.sequence, remainingParts);
        if (found) return found;
      }
      if (element.complexType?.all) {
        const found = findInElements(element.complexType.all, remainingParts);
        if (found) return found;
      }
      if (element.complexType?.choice?.elements) {
        const found = findInElements(element.complexType.choice.elements, remainingParts);
        if (found) return found;
      }
    }

    return null;
  };

  return findInElements(elements, pathParts);
};

// Глубокая копия элемента
const deepCopyElement = (element: any): any => {
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
};

// Очистка значений элемента
const clearElementValues = (element: any) => {
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
};

// Генерация уникальных ID для нового элемента
const generateUniqueIds = (element: any, itemType: string) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  const generateId = (pattern: string): string => {
    if (pattern.includes('Object([0-9])+')) {
      return `Object${timestamp}${random}`;
    } else if (pattern.includes('Relation([0-9]+)')) {
      return `Relation${timestamp}${random}`;
    } else if (pattern.includes('Property([0-9])+')) {
      return `Property${timestamp}${random}`;
    } else if (pattern.includes('Condition([0-9]+)')) {
      return `Condition${timestamp}${random}`;
    }
    return `${itemType}${timestamp}${random}`;
  };

  if (
    element.simpleType?.restriction?.pattern &&
    (element.name === 'EntityUid' || element.name === 'RelationUid' || element.name === 'PropertyUid')
  ) {
    element.value = generateId(element.simpleType.restriction.pattern);
  }

  // Рекурсивно обрабатываем вложенные элементы
  if (element.complexType?.sequence) {
    Object.values(element.complexType.sequence).forEach((child: any) =>
      generateUniqueIds(child, itemType)
    );
  }
  if (element.complexType?.all) {
    Object.values(element.complexType.all).forEach((child: any) =>
      generateUniqueIds(child, itemType)
    );
  }
  if (element.complexType?.choice?.elements) {
    Object.values(element.complexType.choice.elements).forEach((child: any) =>
      generateUniqueIds(child, itemType)
    );
  }
};

// Генерация XML
const generateXML = () => {
  try {
    // Сначала синхронизируем все значения из elementValues в schema
    syncValuesToSchema();

    // Получаем информацию о схеме для отладки
    const schemaInfo = getSchemaInfo(schema);
    console.log('Schema info:', schemaInfo);

    // Генерируем XML с валидацией
    generatedXML.value = generateXMLWithValidation(schema);
    console.log('Generated XML from schema:', schema);
  } catch (error) {
    console.error('Error generating XML:', error);
    generatedXML.value = 'Ошибка генерации XML: ' + (error as Error).message;
  }
};


// Функция для получения экземпляров по типу
const getComplexTypeInstances = (type: string): ComplexTypeInstance[] => {
  return complexTypesStore.value.filter(instance => instance.type === type);
};

// Функция для добавления сложного типа в схему
const applyComplexTypeToElement = (elementPath: string, complexTypeInstance: ComplexTypeInstance) => {
  const targetElement = findElementByPath(schema.elements, elementPath);
  if (targetElement) {
    targetElement.value = complexTypeInstance.data;
    updateElementValue(elementPath, complexTypeInstance.data);
  }
};

  return {
    schema,
    generatedXML,
    generateXML,
    handleFileUpload,
    updateElementValue,
    handleAddItem,
    complexTypesStore,
    getComplexTypeInstances,
    applyComplexTypeToElement
  };
}