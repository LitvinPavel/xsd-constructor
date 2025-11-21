import { ref } from 'vue';
import type { XSDSchema, XSDElement, FormField } from '../types';
import { XSDParser } from '../utils/xsdParser';
import { XMLGenerator } from '../utils/xmlGenerator';

export interface FormGroup {
  name: string;
  label: string;
  fields: FormField[];
  groups: FormGroup[];
  data: Record<string, any>;
  element?: XSDElement; // Добавляем ссылку на элемент схемы
}

export function useXSDForm() {
  const schema = ref<XSDSchema | null>(null);
  const formData = ref<Record<string, any>>({});
  const formGroups = ref<FormGroup[]>([]);

  const parseXSD = (xsdContent: string): void => {
    const parser = new XSDParser();
    schema.value = parser.parseXSDToJSON(xsdContent);
    generateFormStructure();
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) =>
        resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const generateFormStructure = (): void => {
    if (!schema.value) return;

    formGroups.value = [];
    formData.value = {};

    schema.value.elements.forEach((element) => {
      const group = processElement(element, formData.value);
      if (group) {
        formGroups.value.push(group);
      }
    });
  };

  const processElement = (
    element: XSDElement,
    parentData: Record<string, any>,
    parentName: string = ''
  ): FormGroup | null => {
    const fullName = parentName
      ? `${parentName}.${element.name}`
      : element.name;
    const group: FormGroup = {
      name: element.name,
      label: element.annotation?.documentation || element.name,
      fields: [],
      groups: [],
      data: {},
      element: element, // Сохраняем элемент схемы
    };

    // Если это родительский элемент с complexType и sequence
    if (!element.type && element.complexType?.sequence) {
      parentData[element.name] = group.data;

      element.complexType.sequence.forEach((seqElement) => {
        const childGroup = processElement(seqElement, group.data, element.name);
        if (childGroup) {
          group.groups.push(childGroup);
        }
      });

      return group;
    }

    // Если это поле с типом (листовой элемент)
    if (element.type) {
      const field = createFormField(element, fullName);
      group.fields.push(field);

      // Инициализируем значение в данных только если поле обязательно или есть значение по умолчанию
      if (field.required || field.value !== '') {
        setFormDataValue(parentData, element.name, field.value);
      }
      return group;
    }

    // Если есть вложенный complexType
    if (element.complexType?.sequence) {
      parentData[element.name] = group.data;

      element.complexType.sequence.forEach((seqElement) => {
        const childGroup = processElement(seqElement, group.data, element.name);
        if (childGroup) {
          group.groups.push(childGroup);
        }
      });

      return group;
    }

    // Если есть вложенный complexType через all
    if (element.complexType?.all) {
      parentData[element.name] = group.data;

      element.complexType.all.forEach((allElement) => {
        const childGroup = processElement(allElement, group.data, element.name);
        if (childGroup) {
          group.groups.push(childGroup);
        }
      });

      return group;
    }

    return null;
  };

  const createFormField = (
    element: XSDElement,
    fullName: string
  ): FormField => {
    const defaultValue = getDefaultValue(element);

    const baseField: FormField = {
      name: element.name,
      fullName: fullName,
      type: element.type || 'string',
      label: element.annotation?.documentation || element.name,
      required: element.minOccurs ? parseInt(element.minOccurs) > 0 : false,
      value: defaultValue,
    };

    // Обработка enumerations
    if (element.simpleType?.restriction?.enumerations) {
      baseField.type = 'select';
      baseField.options = element.simpleType.restriction.enumerations.map(
        (e) => e.value
      );
    }

    return baseField;
  };

  const getDefaultValue = (element: XSDElement): any => {
    if (element.simpleType?.restriction?.enumerations) {
      return element.simpleType.restriction.enumerations[0]?.value || '';
    }

    switch (element.type) {
      case 'xs:integer':
      case 'xs:decimal':
        return element.minOccurs && parseInt(element.minOccurs) > 0 ? 0 : '';
      case 'xs:boolean':
        return false;
      case 'xs:date':
        return element.minOccurs && parseInt(element.minOccurs) > 0
          ? new Date().toISOString().split('T')[0]
          : '';
      default:
        return element.minOccurs && parseInt(element.minOccurs) > 0 ? '' : '';
    }
  };

  const setFormDataValue = (
    data: Record<string, any>,
    path: string,
    value: any
  ): void => {
    data[path] = value;
  };

  const updateFieldValue = (
    groupPath: string[],
    fieldName: string,
    value: any
  ): void => {
    let currentData = formData.value;

    // Проходим по пути к группе
    for (const groupName of groupPath) {
      if (!currentData[groupName]) {
        currentData[groupName] = {};
      }
      currentData = currentData[groupName];
    }

    // Устанавливаем значение поля только если оно не пустое или поле обязательно
    const field = findFieldInGroups(formGroups.value, groupPath, fieldName);
    if (field && (value !== '' || field.required)) {
      currentData[fieldName] = value;
      field.value = value;
    } else if (field && value === '' && !field.required) {
      // Удаляем поле если оно не обязательно и пустое
      delete currentData[fieldName];
      field.value = value;
    }
  };

  const findFieldInGroups = (
    groups: FormGroup[],
    groupPath: string[],
    fieldName: string
  ): FormField | null => {
    if (groupPath.length === 0) {
      const field = groups
        .flatMap((g) => g.fields)
        .find((f) => f.name === fieldName);
      return field || null;
    }

    const [currentGroupName, ...remainingPath] = groupPath;
    const group = groups.find((g) => g.name === currentGroupName);

    if (group) {
      return findFieldInGroups(group.groups, remainingPath, fieldName);
    }

    return null;
  };

  const generateXML = (): string => {
    return XMLGenerator.generateXML(formData.value, schema.value);
  };

  const downloadXML = (filename: string = 'generated.xml'): void => {
    const xmlContent = generateXML();
    XMLGenerator.downloadXML(xmlContent, filename);
  };

  // Вспомогательная функция для получения всех полей
  const getAllFields = (groups: FormGroup[]): FormField[] => {
    return groups.flatMap((group) => [
      ...group.fields,
      ...getAllFields(group.groups),
    ]);
  };

  return {
    schema,
    formData,
    formGroups,
    parseXSD,
    readFileContent,
    updateFieldValue,
    generateXML,
    downloadXML,
    getAllFields,
  };
}
