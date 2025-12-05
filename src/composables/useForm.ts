// composables/useForm.ts
import { ref, reactive, nextTick } from 'vue';
import { XSDParser } from '@/utils/xsdParser';
import { generateXMLWithValidation } from '@/utils/xmlGenerator';
import { deepCopyElement, getNestedValue } from '@/utils/xsdUtils';
import type { XSDSchema } from '@/types';

export function useForm() {
  const schema = reactive<XSDSchema>({
    elements: {},
    complexTypes: {},
    simpleTypes: {},
    entityStructur: {},
    propertyStructur: {},
    relationStructur: {}
  });

  const generatedXML = ref<string>('');
  const elementValues = reactive<{ [path: string]: any }>({});

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) =>
        resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

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

  const parseXSD = (xsdContent: string): void => {
    const parser = new XSDParser();
    const parsedSchema = parser.parseXSDToJSON(xsdContent);
    const complexTypeDefinitions = parser.getComplexTypeDefinitions(
      parser['parser'].parse(xsdContent)
    );
    const get = (path: string) => deepCopyElement(getNestedValue(schema, path));

    Object.keys(schema.elements).forEach(key => delete schema.elements[key]);
    Object.keys(schema.complexTypes).forEach(key => delete schema.complexTypes[key]);
    Object.keys(schema.simpleTypes).forEach(key => delete schema.simpleTypes[key]);
    Object.keys(elementValues).forEach(key => delete elementValues[key]);

    Object.assign(schema, parsedSchema);
    Object.assign(schema.complexTypes, complexTypeDefinitions);
    Object.assign(schema, {
      entityStructur: get('elements.Requirement.complexType.sequence.DMODEL.complexType.sequence.Entities.complexType.sequence.Entity'),
      propertyStructur: get('elements.Requirement.complexType.sequence.DMODEL.complexType.sequence.Entities.complexType.sequence.Entity.complexType.sequence.Properties.complexType.sequence.Property'),
      relationStructur: get('elements.Requirement.complexType.sequence.DMODEL.complexType.sequence.Relations.complexType.sequence.Relation')
    })

    removeDefaultDMODELElements();
    initializeElementValues(schema.elements);
  };

  const removeDefaultDMODELElements = () => {
    const removeFromSequence = (sequence: any) => {
      if (!sequence) return;
      
      Object.keys(sequence).forEach(key => {
        if (key === 'Entity' || key === 'Property' || key === 'Relation') {
          delete sequence[key];
        }
      });
    };

    const processElement = (element: any) => {
      if (element.complexType?.sequence) {
        removeFromSequence(element.complexType.sequence);
        Object.values(element.complexType.sequence).forEach((child: any) => {
          processElement(child);
        });
      }
      
      if (element.complexType?.complexContent?.extension?.sequence) {
        removeFromSequence(element.complexType.complexContent.extension.sequence);
        Object.values(element.complexType.complexContent.extension.sequence).forEach((child: any) => {
          processElement(child);
        });
      }
    };

    Object.values(schema.elements).forEach(processElement);
  };

  const updateElementValue = (elementPath: string, value: any) => {
    console.log('Updating element value:', elementPath, value);
    elementValues[elementPath] = value;
    updateSchemaElementValue(schema.elements, elementPath, value);
  };

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
        elements[currentKey].value = value;
        return true;
      } else {
        const element = elements[currentKey];
        console.log(element)

        if (element.complexType?.complexContent?.extension?.sequence) {
          const found = updateSchemaElementValue(
            element.complexType.complexContent.extension.sequence,
            remainingPath,
            value
          );
          if (found) return true;
        }

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

  const initializeElementValues = (
    elements: { [key: string]: any },
    parentPath: string = ''
  ) => {
    Object.entries(elements).forEach(([key, element]) => {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      if (element.complexType?.complexContent?.extension?.base === 'ReqElement') {
        if (!element.value || typeof element.value !== 'object') {
          element.value = {
            attributes: {},
            ReqElementData: '',
            ReqElementNumber: '',
            ReqElementName: '',
            ReqElementLink: '',
            ReqElementNotes: ''
          };
        }
        
        if (!element.value.attributes) {
          element.value.attributes = {};
        }
        
        if (element.name === 'GraphElement') {
          element.value.attributes.ReqElementType = 'графическое изображение';
        } else if (element.name === 'TableElement') {
          element.value.attributes.ReqElementType = 'таблица';
        } else if (element.name === 'FormulaElement') {
          element.value.attributes.ReqElementType = 'формульная запись';
        }
        
        if (!element.value.attributes.ReqElementUId) {
          element.value.attributes.ReqElementUId = generateReqElementUid(element.name);
        }
        
        elementValues[currentPath] = element.value;
      } else if (element.value !== undefined) {
        elementValues[currentPath] = element.value;
      }

      if (element.complexType?.complexContent?.extension?.sequence) {
        initializeElementValues(element.complexType.complexContent.extension.sequence, currentPath);
      }
      
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

  const generateReqElementUid = (elementName: string): string => {
    const prefixMap: { [key: string]: string } = {
      'GraphElement': 'Graph',
      'TableElement': 'Table',
      'FormulaElement': 'Formula'
    };
    
    const prefix = prefixMap[elementName] || 'Element';
    return `${prefix}${Math.floor(Math.random() * 1000)}`;
  };

  const handleAddEntity = async (elementPath: string, entity: any) => {
    await nextTick();
    const targetElement = findElementByPath(schema.elements, elementPath);

    if (targetElement && targetElement.complexType?.sequence) {
      const { EntityID, EntityName, EntityUid, Properties } = schema.entityStructur?.complexType?.sequence || {};
    const newKey = `Entity_${Date.now()}`;
    const newItem = {
      name: 'Entity',
      annotation: entity.annotation,
      complexType: {
        sequence: {
          EntityUid: {
            ...EntityUid,
            value: entity.data.EntityUid || `Object${Date.now()}`
          },
          EntityName: {
            ...EntityName,
            value: entity.data.EntityName || 'Новая сущность'
          },
          EntityID: {
            ...EntityID,
            value: entity.data.EntityID
          },
          Properties: {
            ...Properties,
            complexType: { sequence: {} }
          }
        }
      }
    };
    targetElement.complexType.sequence[newKey] = newItem;
    initializeElementValues({ [newKey]: newItem }, elementPath);
    }
    
  };

  const handleAddProperty = async (elementPath: string, property: any) => {
    await nextTick();

    const targetElement = findElementByPath(schema.elements, elementPath);

    if (targetElement && targetElement.complexType?.sequence) {
      const newKey = `Property_${Date.now()}`;
      const { PropertyID, PropertyName, PropertyUid, PropertyCond } = schema.propertyStructur?.complexType?.sequence || {};
      const newItem = {
        name: 'Property',
        annotation: property.annotation,
        complexType: {
          sequence: {
            PropertyUid: {
              ...PropertyUid,
              value: property.data.PropertyUid || newKey
            },
            PropertyName: {
              ...PropertyName,
              value: property.data.PropertyName || 'Новое свойство'
            },
            PropertyID: {
              ...PropertyID,
              value: property.data.PropertyID
            },
            PropertyCond: {
              ...PropertyCond,
              value: property.data.PropertyCond || []
            }
          }
        }
      };

      targetElement.complexType.sequence[newKey] = newItem;
      initializeElementValues({ [newKey]: newItem }, elementPath);
    }
  };

  const handleAddRelation = async (elementPath: string) => {
    await nextTick();


    const targetElement = findElementByPath(schema.elements, elementPath);

    if (targetElement && targetElement.complexType?.sequence) {
      const newKey = `Relation_${Date.now()}`;
      const newItem = {
        ...schema.relationStructur,
        complexType: {
          ...schema.relationStructur.complexType,
          sequence: {
            ...schema.relationStructur.complexType?.sequence,
            RelationUid: {
              ...schema.relationStructur.complexType?.sequence?.RelationUid,
              value: newKey
            }
          }
        }
      };
      targetElement.complexType.sequence[newKey] = newItem;
      initializeElementValues({ [newKey]: newItem }, elementPath);
    }
  };

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
      (element.name === 'EntityUid' || element.name === 'RelationUid' || 
       element.name === 'PropertyUid' || element.name === 'ConditionUid')
    ) {
      element.value = generateId(element.simpleType.restriction.pattern);
    }

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
    if (element.complexType?.complexContent?.extension?.sequence) {
      Object.values(element.complexType.complexContent.extension.sequence).forEach((child: any) =>
        generateUniqueIds(child, itemType)
      );
    }
  };

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

        if (element.complexType?.complexContent?.extension?.sequence) {
          const found = findInElements(element.complexType.complexContent.extension.sequence, remainingParts);
          if (found) return found;
        }
        
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

  const generateXML = () => {
    try {
      generatedXML.value = generateXMLWithValidation(schema);
    } catch (error) {
      console.error('Error generating XML:', error);
      generatedXML.value = 'Ошибка генерации XML: ' + (error as Error).message;
    }
  };

  return {
    schema,
    generatedXML,
    generateXML,
    handleFileUpload,
    updateElementValue,
    handleAddEntity,
    handleAddProperty,
    handleAddRelation
  };
}