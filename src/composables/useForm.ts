// composables/useForm.ts
import { ref, reactive, nextTick, markRaw } from "vue";
import { XSDParser } from "@/utils/xsdParser";
import { generateXMLWithValidation } from "@/utils/xmlGenerator";
import { deepCopyElement, getNestedValue, generateDefaultUid } from "@/utils/xsdUtils";
import type { XSDSchema } from "@/types";

export function useForm() {
  const schema = reactive<XSDSchema>({
    elements: {},
    complexTypes: {},
    simpleTypes: {},
    entityStructur: {},
    propertyStructur: {},
    relationStructur: {},
    pRuleLogicalUnits: {},
  });

  const generatedXML = ref<string>("");
  const elementValues = reactive<{ [path: string]: any }>({});
  const elementPathMap = new Map<string, any>();
  const errorMessage = ref<string | null>(null);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) =>
        resolve((e.target?.result as string) || "");
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      try {
        errorMessage.value = null;
        const content = await readFileContent(file);
        parseXSD(content);
      } catch (error) {
        console.error("Error reading file:", error);
        errorMessage.value = "Не удалось прочитать XSD файл";
      }
    }
  };

  const parseXSD = (xsdContent: string): void => {
    try {
      const parser = new XSDParser();
      const { schema: parsedSchema, complexTypeDefinitions } =
        parser.parseWithDefinitions(xsdContent);
      const get = (path: string) =>
        deepCopyElement(getNestedValue(schema, path));

      Object.keys(schema.elements).forEach(
        (key) => delete schema.elements[key]
      );
      Object.keys(schema.complexTypes).forEach(
        (key) => delete schema.complexTypes[key]
      );
      Object.keys(schema.simpleTypes).forEach(
        (key) => delete schema.simpleTypes[key]
      );
      Object.keys(elementValues).forEach((key) => delete elementValues[key]);
      elementPathMap.clear();

      Object.assign(schema, parsedSchema);
      Object.assign(schema.complexTypes, markRaw(complexTypeDefinitions));
      Object.assign(schema, {
        entityStructur: get(
          "elements.Requirement.complexType.sequence.DMODEL.complexType.sequence.LogicalUnits.complexType.sequence.LogicalUnit.complexType.sequence.Entities.complexType.sequence.Entity"
        ),
        propertyStructur: get(
          "elements.Requirement.complexType.sequence.DMODEL.complexType.sequence.LogicalUnits.complexType.sequence.LogicalUnit.complexType.sequence.Entities.complexType.sequence.Entity.complexType.sequence.Properties.complexType.sequence.Property"
        ),
        relationStructur: get(
          "elements.Requirement.complexType.sequence.DMODEL.complexType.sequence.LogicalUnits.complexType.sequence.LogicalUnit.complexType.sequence.Relations.complexType.sequence.Relation"
        ),
        logicalUnitStructur: get(
          "elements.Requirement.complexType.sequence.DMODEL.complexType.sequence.LogicalUnits.complexType.sequence.LogicalUnit"
        ),
      });

      removeDefaultDMODELElements();
      addPRuleFieldsToLogicalUnits(schema.elements);
      initializeElementValues(schema.elements);
      errorMessage.value = null;
    } catch (error) {
      console.error("Error parsing XSD:", error);
      errorMessage.value =
        "Не удалось разобрать XSD: " + (error as Error).message;
    }
  };

  const removeDefaultDMODELElements = () => {
    const removeFromSequence = (sequence: any) => {
      if (!sequence) return;

      Object.keys(sequence).forEach((key) => {
        if (
          key === "Entity" ||
          key === "Property" ||
          key === "Relation" ||
          key === "LogicalUnit"
        ) {
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
        removeFromSequence(
          element.complexType.complexContent.extension.sequence
        );
        Object.values(
          element.complexType.complexContent.extension.sequence
        ).forEach((child: any) => {
          processElement(child);
        });
      }
    };

    Object.values(schema.elements).forEach(processElement);
  };

  const ensurePRuleLogicalUnitField = (logicalUnit: any) => {
    if (!logicalUnit?.complexType?.sequence) return;
    if (logicalUnit.complexType.sequence.PRuleLogicalUnit) {
      logicalUnit.complexType.sequence.PRuleLogicalUnit.skipInXml = true;
      return;
    }

    logicalUnit.complexType.sequence.PRuleLogicalUnit = {
      name: "PRuleLogicalUnit",
      annotation: {
        documentation: "Авто правило логической единицы (не сохраняется в XML)",
      },
      type: "xs:string",
      value: "",
      skipInXml: true,
    };
  };

  const addPRuleFieldsToLogicalUnits = (
    elements: { [key: string]: any },
    parentPath: string = ""
  ) => {
    Object.entries(elements || {}).forEach(([key, element]) => {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      if (element.name === "LogicalUnit") {
        ensurePRuleLogicalUnitField(element);
      }

      if (element.complexType?.sequence) {
        addPRuleFieldsToLogicalUnits(element.complexType.sequence, currentPath);
      }
      if (element.complexType?.complexContent?.extension?.sequence) {
        addPRuleFieldsToLogicalUnits(
          element.complexType.complexContent.extension.sequence,
          currentPath
        );
      }
      if (element.complexType?.all) {
        addPRuleFieldsToLogicalUnits(element.complexType.all, currentPath);
      }
      if (element.complexType?.choice?.elements) {
        addPRuleFieldsToLogicalUnits(
          element.complexType.choice.elements,
          currentPath
        );
      }
    });
  };

  const getPRulesSequence = () =>
    getNestedValue(
      schema,
      "elements.Requirement.complexType.sequence.PLOGIC.complexType.sequence.PRules.complexType.sequence"
    );

  const syncPRulesWithLogicalUnits = () => {
    const prulesSequence = getPRulesSequence();
    if (!prulesSequence || typeof prulesSequence !== "object") return;

    const values = Object.entries(elementValues)
      .filter(
        ([path, val]) =>
          path.endsWith("PRuleLogicalUnit") &&
          val !== undefined &&
          val !== null &&
          val !== ""
      )
      .map(([, val]) => String(val));

    const template =
      prulesSequence.PRule || Object.values(prulesSequence || {})[0];
    if (!template) return;

    const nextSequence: Record<string, any> = {};
    values.forEach((val, idx) => {
      const key = generateDefaultUid('PRule_');
      const prule = deepCopyElement(template);

      if (prule.complexType?.sequence?.PRuleData) {
        prule.complexType.sequence.PRuleData.value = val;
      } else {
        prule.value = val;
      }

      if (prule.complexType?.attributes?.PRuleID) {
        prule.complexType.attributes.PRuleID.value = idx + 1;
      }

      nextSequence[key] = prule;
    });

    Object.keys(prulesSequence).forEach((key) => delete prulesSequence[key]);
    Object.assign(prulesSequence, nextSequence);
  };

  const updateElementValue = (elementPath: string, value: any) => {
    elementValues[elementPath] = value;
    const targetElement = elementPathMap.get(elementPath);
    if (targetElement) {
      targetElement.value = value;
    } else {
      updateSchemaElementValue(elementPath, value);
    }

    if (
      elementPath.endsWith("PropertyCond") ||
      elementPath.endsWith("RelationCond")
    ) {

      const logicalUnitId = elementPath.match(/LogicalUnit_\d+/)?.[0] as string;
      schema.pRuleLogicalUnits = {
        ...schema.pRuleLogicalUnits,
        [logicalUnitId]: {
          ...schema.pRuleLogicalUnits?.[logicalUnitId],
          [value.ConditionUid]: value.ConditionRole,
        },
      };
    } else if (elementPath.endsWith("RelationRole")) {
      const logicalUnitId = elementPath.match(/LogicalUnit_\d+/)?.[0] as string;
      const relationUid = elementPath.match(/Relation_\d+/)?.[0] as string;

      schema.pRuleLogicalUnits = {
        ...schema.pRuleLogicalUnits,
        [logicalUnitId]: {
          ...schema.pRuleLogicalUnits?.[logicalUnitId],
          [relationUid]: value,
        },
      };
    } else if (elementPath.endsWith("PRuleLogicalUnit")) {
      syncPRulesWithLogicalUnits();
    }
  };

  const updateSchemaElementValue = (path: string, value: any): boolean => {
    const targetElement = elementPathMap.get(path);
    if (targetElement) {
      targetElement.value = value;
      return true;
    }
    return false;
  };

  const initializeElementValues = (
    elements: { [key: string]: any },
    parentPath: string = ""
  ) => {
    Object.entries(elements).forEach(([key, element]) => {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      elementPathMap.set(currentPath, element);

      if (
        element.complexType?.complexContent?.extension?.base === "ReqElement"
      ) {
        if (!element.value || typeof element.value !== "object") {
          element.value = {
            attributes: {},
            ReqElementData: "",
            ReqElementNumber: "",
            ReqElementName: "",
            ReqElementLink: "",
            ReqElementNotes: "",
          };
        }

        if (!element.value.attributes) {
          element.value.attributes = {};
        }

        if (element.name === "GraphElement") {
          element.value.attributes.ReqElementType = "графическое изображение";
        } else if (element.name === "TableElement") {
          element.value.attributes.ReqElementType = "таблица";
        } else if (element.name === "FormulaElement") {
          element.value.attributes.ReqElementType = "формульная запись";
        }

        if (!element.value.attributes.ReqElementUId) {
          element.value.attributes.ReqElementUId = generateDefaultUid(
            element.name
          );
        }

        elementValues[currentPath] = element.value;
      } else if (element.value !== undefined) {
        elementValues[currentPath] = element.value;
      }

      if (element.complexType?.complexContent?.extension?.sequence) {
        initializeElementValues(
          element.complexType.complexContent.extension.sequence,
          currentPath
        );
      }

      if (element.complexType?.sequence) {
        initializeElementValues(element.complexType.sequence, currentPath);
      }
      if (element.complexType?.all) {
        initializeElementValues(element.complexType.all, currentPath);
      }
      if (element.complexType?.choice?.elements) {
        initializeElementValues(
          element.complexType.choice.elements,
          currentPath
        );
      }
    });
  };

  const handleAddEntity = async (elementPath: string, entity: any) => {
    await nextTick();
    const targetElement = elementPathMap.get(elementPath);

    if (targetElement && targetElement.complexType?.sequence) {
      const { EntityID, EntityName, EntityUid, Properties } =
        schema.entityStructur?.complexType?.sequence || {};
      const newKey = `Entity_${Date.now()}`;
      const newItem = reactive({
        name: "Entity",
        annotation: entity.annotation,
        complexType: {
          sequence: {
            EntityUid: {
              ...EntityUid,
              value: entity.data.EntityUid || `Object${Date.now()}`,
            },
            EntityName: {
              ...EntityName,
              value: entity.data.EntityName || "Новая сущность",
            },
            EntityID: {
              ...EntityID,
              value: entity.data.EntityID,
            },
            Properties: {
              ...Properties,
              complexType: { sequence: {} },
            },
          },
        },
      });
      targetElement.complexType.sequence = reactive({
        ...targetElement.complexType.sequence,
        [newKey]: newItem,
      });
      initializeElementValues({ [newKey]: newItem }, elementPath);
    }
  };

  const handleAddProperty = async (elementPath: string, property: any) => {
    await nextTick();

    const targetElement = elementPathMap.get(elementPath);

    if (targetElement && targetElement.complexType?.sequence) {
      const newKey = `Property_${Date.now()}`;
      const { PropertyID, PropertyName, PropertyUid, PropertyCond } =
        schema.propertyStructur?.complexType?.sequence || {};
      const newItem = reactive({
        name: "Property",
        annotation: property.annotation,
        complexType: {
          sequence: {
            PropertyUid: {
              ...PropertyUid,
              value: property.data.PropertyUid || newKey,
            },
            PropertyName: {
              ...PropertyName,
              value: property.data.PropertyName || "Новое свойство",
            },
            PropertyID: {
              ...PropertyID,
              value: property.data.PropertyID,
            },
            PropertyCond: {
              ...PropertyCond,
              value: property.data.PropertyCond || [],
            },
          },
        },
      });

      targetElement.complexType.sequence = reactive({
        ...targetElement.complexType.sequence,
        [newKey]: newItem,
      });
      initializeElementValues({ [newKey]: newItem }, elementPath);
    }
  };

  const handleAddRelation = async (elementPath: string) => {
    await nextTick();

    const targetElement = elementPathMap.get(elementPath);

    if (targetElement && targetElement.complexType?.sequence) {
      const newKey = `Relation_${Date.now()}`;
      const newItem = reactive({
        ...schema.relationStructur,
        complexType: {
          ...schema.relationStructur.complexType,
          sequence: {
            ...schema.relationStructur.complexType?.sequence,
            RelationUid: {
              ...schema.relationStructur.complexType?.sequence?.RelationUid,
              value: newKey,
            },
          },
        },
      });
      targetElement.complexType.sequence = reactive({
        ...targetElement.complexType.sequence,
        [newKey]: newItem,
      });
      initializeElementValues({ [newKey]: newItem }, elementPath);
    }
  };

  const handleAddLogicalUnit = async (elementPath: string) => {
    await nextTick();
    const targetElement = elementPathMap.get(elementPath);

    if (
      targetElement &&
      targetElement.complexType?.sequence &&
      schema.logicalUnitStructur
    ) {
      const newKey = `LogicalUnit_${Date.now()}`;
      const newItem = reactive({
        ...schema.logicalUnitStructur,
        complexType: {
          ...schema.logicalUnitStructur.complexType,
          sequence: {
            ...schema.logicalUnitStructur.complexType?.sequence,
            Entities: {
              ...schema.logicalUnitStructur.complexType?.sequence?.Entities,
              complexType: { sequence: {} },
            },
            Relations: {
              ...schema.logicalUnitStructur.complexType?.sequence?.Relations,
              complexType: { sequence: {} },
            },
          },
        },
      });
      ensurePRuleLogicalUnitField(newItem);
      targetElement.complexType.sequence = reactive({
        ...targetElement.complexType.sequence,
        [newKey]: newItem,
      });
      initializeElementValues({ [newKey]: newItem }, elementPath);
    }
  };

  const generateUniqueIds = (element: any, itemType: string) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);

    const generateId = (pattern: string): string => {
      if (pattern.includes("Object([0-9])+")) {
        return `Object${timestamp}${random}`;
      } else if (pattern.includes("Relation([0-9]+)")) {
        return `Relation${timestamp}${random}`;
      } else if (pattern.includes("Property([0-9])+")) {
        return `Property${timestamp}${random}`;
      } else if (pattern.includes("Condition([0-9]+)")) {
        return `Condition${timestamp}${random}`;
      }
      return `${itemType}${timestamp}${random}`;
    };

    if (
      element.simpleType?.restriction?.pattern &&
      (element.name === "EntityUid" ||
        element.name === "RelationUid" ||
        element.name === "PropertyUid" ||
        element.name === "ConditionUid")
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
      Object.values(
        element.complexType.complexContent.extension.sequence
      ).forEach((child: any) => generateUniqueIds(child, itemType));
    }
  };

  const generateXML = () => {
    try {
      errorMessage.value = null;
      generatedXML.value = generateXMLWithValidation(schema);
    } catch (error) {
      console.error("Error generating XML:", error);
      const message = (error as Error).message || "Неизвестная ошибка";
      errorMessage.value = "Ошибка генерации XML: " + message;
      generatedXML.value = "Ошибка генерации XML: " + message;
    }
  };

  return {
    schema,
    generatedXML,
    errorMessage,
    generateXML,
    handleFileUpload,
    updateElementValue,
    handleAddEntity,
    handleAddProperty,
    handleAddRelation,
    handleAddLogicalUnit,
  };
}
