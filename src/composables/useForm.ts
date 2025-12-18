// composables/useForm.ts
import { ref, reactive, nextTick, markRaw } from "vue";
import { XSDParser } from "@/utils/xsdParser";
import { generateXMLWithValidation } from "@/utils/xmlGenerator";
import {
  deepCopyElement,
  getNestedValue,
  generateUid,
  isUidFieldName,
  clearElementValues,
  getReqElementType,
} from "@/utils/xsdUtils";
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
    pRuleManualInputs: {},
  });

  const generatedXML = ref<string>("");
  const elementValues = reactive<{ [path: string]: any }>({});
  const elementPathMap = new Map<string, any>();
  const errorMessage = ref<string | null>(null);
  const pruleTemplate = ref<any | null>(null);
  const dynamicTemplates: Record<string, any> = reactive({});

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
      schema.pRuleLogicalUnits = {};
      schema.pRuleManualInputs = {};
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
      applyReqElementDefinition(schema.elements);
      applyReqElementDefinition(dynamicTemplates);
      applyLinkTypeToElements(schema.elements);
      applyLinkTypeToElements(dynamicTemplates);
      applyConditionTypeToCondFields(schema.elements);
      applyConditionTypeToCondFields(
        schema.propertyStructur?.complexType?.sequence || {}
      );
      applyConditionTypeToCondFields(
        schema.relationStructur?.complexType?.sequence || {}
      );
      preparePRulesTemplateAndClear();
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
    const dynamicKeys = [
      "Entity",
      "Property",
      "Relation",
      "LogicalUnit",
      "ReqElementObject",
      "PropertyCond",
      "RelationCond",
      "KeyWord",
      "Developer",
      "ObjectOfStandartization",
      "SecurityAspect",
      "ObjectOfReq",
      "ReqLink",
      "NeedDataLink",
      "GraphElement",
      "TableElement",
      "FormulaElement",
    ];
    const removeFromSequence = (sequence: any) => {
      if (!sequence) return;

      Object.keys(sequence).forEach((key) => {
        if (dynamicKeys.includes(key)) {
          if (!dynamicTemplates[key]) {
            dynamicTemplates[key] = deepCopyElement(sequence[key]);
          }
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

    const removeReqElementObjectFromDefinition = () => {
      const req = schema.complexTypes?.ReqElement;
      const reqObjSequence =
        req?.sequence?.ReqElementObjects?.complexType?.sequence;
      const reqObj = reqObjSequence?.ReqElementObject;
      if (reqObj) {
        if (!dynamicTemplates.ReqElementObject) {
          dynamicTemplates.ReqElementObject = deepCopyElement(reqObj);
        }
        delete reqObjSequence.ReqElementObject;
      }
    };

    Object.values(schema.elements).forEach(processElement);
    removeReqElementObjectFromDefinition();
  };

  const preparePRulesTemplateAndClear = () => {
    const prulesSequence = getPRulesSequence();
    if (!prulesSequence || typeof prulesSequence !== "object") return;

    const template =
      prulesSequence.PRule || Object.values(prulesSequence || {})[0];
    if (template) {
      pruleTemplate.value = deepCopyElement(template);
    }

    Object.keys(prulesSequence).forEach((key) => delete prulesSequence[key]);
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
        documentation: "Программное правило логической единицы",
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

  const applyConditionTypeToCondFields = (
    elements: { [key: string]: any },
    parentPath: string = ""
  ) => {
    const conditionType =
      schema.complexTypes?.ConditionType || schema.complexTypes?.Condition;
    if (!conditionType) return;

    Object.entries(elements || {}).forEach(([key, element]) => {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      if (element.name === "PropertyCond" || element.name === "RelationCond") {
        element.type = undefined;
        element.simpleType = undefined;
        element.complexType = deepCopyElement(conditionType);
      }

      if (element.complexType?.sequence) {
        applyConditionTypeToCondFields(
          element.complexType.sequence,
          currentPath
        );
      }
      if (element.complexType?.complexContent?.extension?.sequence) {
        applyConditionTypeToCondFields(
          element.complexType.complexContent.extension.sequence,
          currentPath
        );
      }
      if (element.complexType?.all) {
        applyConditionTypeToCondFields(element.complexType.all, currentPath);
      }
      if (element.complexType?.choice?.elements) {
        applyConditionTypeToCondFields(
          element.complexType.choice.elements,
          currentPath
        );
      }
    });
  };

  const applyReqElementDefinition = (
    target: Record<string, any> | any | undefined
  ) => {
    const reqDefinition = schema.complexTypes?.ReqElement;
    if (!reqDefinition || !target) return;

    const mergeReqElement = (element: any) => {
      const extension = element?.complexType?.complexContent?.extension;
      const isReqElementType =
        element?.type === "ReqElement" ||
        extension?.base === "ReqElement";

      if (!isReqElementType) return;

      const baseCopy = deepCopyElement(reqDefinition);
      const mergedSequence = {
        ...(baseCopy.sequence || {}),
        ...(extension?.sequence || {}),
      };
      const mergedAttributes = {
        ...(baseCopy.attributes || {}),
        ...(extension?.attributes || {}),
      };
      const mergedChoice = extension?.choice || baseCopy.choice;
      const mergedAnnotation =
        element?.complexType?.annotation || baseCopy.annotation;

      element.type = undefined;
      element.simpleType = undefined;
      element.complexType = {
        ...baseCopy,
        annotation: mergedAnnotation,
        sequence: mergedSequence,
        attributes: mergedAttributes,
        choice: mergedChoice,
      };
    };

    const walk = (element: any) => {
      if (!element || typeof element !== "object") return;

      mergeReqElement(element);

      if (element.complexType?.sequence) {
        Object.values(element.complexType.sequence).forEach((child: any) =>
          walk(child)
        );
      }
      if (element.complexType?.complexContent?.extension?.sequence) {
        Object.values(
          element.complexType.complexContent.extension.sequence
        ).forEach((child: any) => walk(child));
      }
      if (element.complexType?.all) {
        Object.values(element.complexType.all).forEach((child: any) =>
          walk(child)
        );
      }
      if (element.complexType?.choice?.elements) {
        Object.values(element.complexType.choice.elements).forEach(
          (child: any) => walk(child)
        );
      }
    };

    if (target.name) {
      walk(target);
    } else {
      Object.values(target || {}).forEach((item: any) => walk(item));
    }
  };

  const applyLinkTypeToElements = (elements: { [key: string]: any }) => {
    const linkType = schema.complexTypes?.Link;
    if (!linkType || !elements) return;

    const walk = (element: any) => {
      if (!element || typeof element !== "object") return;

      if (element.type === "Link") {
        element.type = undefined;
        element.simpleType = undefined;
        element.complexType = deepCopyElement(linkType);
      }

      if (element.complexType?.sequence) {
        Object.values(element.complexType.sequence).forEach((child: any) =>
          walk(child)
        );
      }
      if (element.complexType?.complexContent?.extension?.sequence) {
        Object.values(
          element.complexType.complexContent.extension.sequence
        ).forEach((child: any) => walk(child));
      }
      if (element.complexType?.all) {
        Object.values(element.complexType.all).forEach((child: any) =>
          walk(child)
        );
      }
      if (element.complexType?.choice?.elements) {
        Object.values(element.complexType.choice.elements).forEach(
          (child: any) => walk(child)
        );
      }
    };

    Object.values(elements).forEach((element: any) => walk(element));
  };

  const getPRulesSequence = () =>
    getNestedValue(
      schema,
      "elements.Requirement.complexType.sequence.PLOGIC.complexType.sequence.PRules.complexType.sequence"
    );

  const collectPRuleLogicalUnitValues = (elements: {
    [key: string]: any;
  }): { logicalUnitId: string; value: string }[] => {
    const result: { logicalUnitId: string; value: string }[] = [];

    Object.entries(elements || {}).forEach(([key, element]: [string, any]) => {
      if (element?.name === "LogicalUnit") {
        const prule = element.complexType?.sequence?.PRuleLogicalUnit;
        if (
          prule &&
          prule.value !== undefined &&
          prule.value !== null &&
          prule.value !== ""
        ) {
          const logicalUnitId = key.match(/LogicalUnit_\d+/)?.[0] || key;
          result.push({ logicalUnitId, value: String(prule.value) });
        }
      }

      if (element.complexType?.sequence) {
        result.push(
          ...collectPRuleLogicalUnitValues(element.complexType.sequence)
        );
      }
      if (element.complexType?.complexContent?.extension?.sequence) {
        result.push(
          ...collectPRuleLogicalUnitValues(
            element.complexType.complexContent.extension.sequence
          )
        );
      }
      if (element.complexType?.all) {
        result.push(...collectPRuleLogicalUnitValues(element.complexType.all));
      }
      if (element.complexType?.choice?.elements) {
        result.push(
          ...collectPRuleLogicalUnitValues(element.complexType.choice.elements)
        );
      }
    });

    return result;
  };

  const syncPRulesWithLogicalUnits = () => {
    const prulesSequence = getPRulesSequence();
    if (!prulesSequence || typeof prulesSequence !== "object") return;

    const entries = collectPRuleLogicalUnitValues(schema.elements);

    const template =
      pruleTemplate.value ||
      prulesSequence.PRule ||
      Object.values(prulesSequence || {})[0];
    if (!template) return;

    const nextSequence: Record<string, any> = {};
    entries.forEach(({ logicalUnitId, value }, idx) => {
      const key = generateUid("PRule_");
      const prule = deepCopyElement(template);

      if (prule.complexType?.sequence?.PRuleData) {
        prule.complexType.sequence.PRuleData.value = value;
      } else {
        prule.value = value;
      }

      if (prule.complexType?.sequence?.PRuleType) {
        const isManual = !!schema.pRuleManualInputs?.[logicalUnitId];
        prule.complexType.sequence.PRuleType.value = isManual
          ? "ручной"
          : "автоматический";
      }

      if (prule.complexType?.attributes?.PRuleID) {
        prule.complexType.attributes.PRuleID.value = idx + 1;
      }

      nextSequence[key] = prule;
    });

    Object.keys(prulesSequence).forEach((key) => delete prulesSequence[key]);
    Object.assign(prulesSequence, nextSequence);
  };

  const buildPRuleLogicalUnitValue = (
    pRuleLogicalUnitMap?: Record<string, string>
  ): string | null => {
    if (!pRuleLogicalUnitMap) return null;

    const beforeThen: string[] = [];
    const afterThen: string[] = [];

    Object.keys(pRuleLogicalUnitMap).forEach((key) => {
      if (pRuleLogicalUnitMap[key] === "посылка") {
        beforeThen.push(key);
      } else if (pRuleLogicalUnitMap[key] === "следствие") {
        afterThen.push(key);
      }
    });

    if (beforeThen.length && !afterThen.length) {
      return `${beforeThen.map((key) => `(${key})`).join(" AND ")}`;
    }

    if (beforeThen.length && afterThen.length) {
      return `IF ${beforeThen
        .map((key) => `(${key})`)
        .join(" AND ")} THEN ${afterThen
        .map((key) => `(${key})`)
        .join(" AND ")}`;
    }

    return null;
  };

  const extractPRuleLogicalUnitEntries = (element: any) => {
    const result: Record<string, string> = {};

    const walk = (item: any) => {
      if (!item || typeof item !== "object") return;

      if (item.name === "Relation") {
        const uid = item?.complexType?.sequence?.RelationUid?.value;
        const role = item?.complexType?.sequence?.RelationRole?.value;
        if (uid && role) {
          result[uid] = role;
        }
      }

      if (item.name === "PropertyCond" || item.name === "RelationCond") {
        const uid = item?.complexType?.sequence?.ConditionUid?.value;
        const role = item?.complexType?.sequence?.ConditionRole?.value;
        if (uid && role) {
          result[uid] = role;
        }
      }

      if (item.complexType?.sequence) {
        Object.values(item.complexType.sequence).forEach((child: any) =>
          walk(child)
        );
      }
      if (item.complexType?.complexContent?.extension?.sequence) {
        Object.values(
          item.complexType.complexContent.extension.sequence
        ).forEach((child: any) => walk(child));
      }
      if (item.complexType?.all) {
        Object.values(item.complexType.all).forEach((child: any) =>
          walk(child)
        );
      }
      if (item.complexType?.choice?.elements) {
        Object.values(item.complexType.choice.elements).forEach((child: any) =>
          walk(child)
        );
      }
    };

    walk(element);
    return result;
  };

  const getLogicalUnitPath = (path: string, logicalUnitId: string) => {
    const segments = path.split(".");
    const index = segments.findIndex((segment) => segment === logicalUnitId);
    if (index === -1) return null;
    return segments.slice(0, index + 1).join(".");
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
    } else if (
      elementPath.includes("PropertyCond.") ||
      elementPath.includes("RelationCond.")
    ) {
      const logicalUnitId = elementPath.match(/LogicalUnit_\d+/)?.[0] as string;
      if (logicalUnitId) {
        const segments = elementPath.split(".");
        const condIndex = segments.findIndex((seg) =>
          ["PropertyCond", "RelationCond"].includes(seg)
        );
        const condRootPath = segments.slice(0, condIndex + 1).join(".");

        const conditionUid = elementPath.endsWith("ConditionUid")
          ? value
          : elementValues[`${condRootPath}.ConditionUid`];
        const conditionRole = elementPath.endsWith("ConditionRole")
          ? value
          : elementValues[`${condRootPath}.ConditionRole`];

        if (conditionUid && conditionRole) {
          schema.pRuleLogicalUnits = {
            ...schema.pRuleLogicalUnits,
            [logicalUnitId]: {
              ...schema.pRuleLogicalUnits?.[logicalUnitId],
              [conditionUid]: conditionRole,
            },
          };
        }
      }
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

  const applyReqElementDefaults = (element: any) => {
    const attrs = element?.complexType?.attributes;
    if (!attrs) return;

    const typeAttr = attrs.ReqElementType;
    const reqType = getReqElementType(element?.name || "");
    if (
      typeAttr &&
      reqType &&
      (typeAttr.value === undefined ||
        typeAttr.value === null ||
        typeAttr.value === "")
    ) {
      typeAttr.value = reqType;
    }

    const uidAttr =
      attrs.ReqElementUId || attrs.ReqElementUid || attrs.ReqElementUID;
    if (
      uidAttr &&
      (uidAttr.value === undefined ||
        uidAttr.value === null ||
        uidAttr.value === "")
    ) {
      uidAttr.value = generateUid(
        element?.name,
        uidAttr.simpleType?.restriction?.pattern
      );
    }
  };

  const initializeElementValues = (
    elements: { [key: string]: any },
    parentPath: string = ""
  ) => {
    Object.entries(elements).forEach(([key, element]) => {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      elementPathMap.set(currentPath, element);

      applyReqElementDefaults(element);

      const shouldAutofillUid =
        isUidFieldName(element.name) &&
        (element.value === undefined ||
          element.value === "" ||
          element.value === null);

      if (shouldAutofillUid) {
        generateUniqueIds(element, element.name);
      }

      if (element.value !== undefined) {
        elementValues[currentPath] = element.value;
      }

      if (element.name === "Condition" && !element.value) {
        generateUniqueIds(element, "Condition");
        elementValues[currentPath] = element.value;
      }

      if (element.name === "Entity" && !element.value) {
        generateUniqueIds(element, "Entity");
        elementValues[currentPath] = element.value;
      }

      if (element.name === "Property" && !element.value) {
        generateUniqueIds(element, "Property");
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

  const handleAddEntity = async (elementPath: string) => {
    await nextTick();
    const targetElement = elementPathMap.get(elementPath);

    if (
      targetElement &&
      targetElement.complexType?.sequence &&
      schema.entityStructur
    ) {
      const newKey = `Entity_${Date.now()}`;
      const newItem = reactive(deepCopyElement(schema.entityStructur));

      if (newItem.complexType?.sequence) {
        if (newItem.complexType.sequence.EntityUid) {
          newItem.complexType.sequence.EntityUid.value = "";
        }
        if (newItem.complexType.sequence.EntityName) {
          newItem.complexType.sequence.EntityName.value = "";
        }
        if (newItem.complexType.sequence.EntityID) {
          newItem.complexType.sequence.EntityID.value = undefined;
        }
        if (newItem.complexType.sequence.Properties) {
          newItem.complexType.sequence.Properties = reactive({
            ...newItem.complexType.sequence.Properties,
            complexType: { sequence: {} },
          });
        }

        generateUniqueIds(newItem, "Entity");
      }

      targetElement.complexType.sequence = reactive({
        ...targetElement.complexType.sequence,
        [newKey]: newItem,
      });
      initializeElementValues({ [newKey]: newItem }, elementPath);
    }
  };

  const handleAddProperty = async (elementPath: string) => {
    await nextTick();

    const targetElement = elementPathMap.get(elementPath);

    if (
      targetElement &&
      targetElement.complexType?.sequence &&
      schema.propertyStructur
    ) {
      const newKey = `Property_${Date.now()}`;
      const newItem = reactive(deepCopyElement(schema.propertyStructur));

      if (newItem.complexType?.sequence) {
        if (newItem.complexType.sequence.PropertyUid) {
          newItem.complexType.sequence.PropertyUid.value = "";
        }
        if (newItem.complexType.sequence.PropertyName) {
          newItem.complexType.sequence.PropertyName.value = "";
        }
        if (newItem.complexType.sequence.PropertyID) {
          newItem.complexType.sequence.PropertyID.value = undefined;
        }
        if (newItem.complexType.sequence.PropertyCond) {
          // Убираем условие по умолчанию: добавляется отдельной кнопкой
          delete newItem.complexType.sequence.PropertyCond;
        }
        applyConditionTypeToCondFields(newItem.complexType.sequence);

        generateUniqueIds(newItem, "Property");
      }

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
      const newItem = reactive(deepCopyElement(schema.relationStructur));

      if (newItem.complexType?.sequence) {
        if (newItem.complexType.sequence.RelationUid) {
          newItem.complexType.sequence.RelationUid.value = newKey;
        }
        if (newItem.complexType.sequence.RelationRole) {
          newItem.complexType.sequence.RelationRole.value = "";
        }
        if (newItem.complexType.sequence.RelationCond) {
          // Убираем условие по умолчанию: добавляется отдельной кнопкой
          delete newItem.complexType.sequence.RelationCond;
        }
      }
      applyConditionTypeToCondFields(newItem.complexType?.sequence || {});
      targetElement.complexType.sequence = reactive({
        ...targetElement.complexType.sequence,
        [newKey]: newItem,
      });
      initializeElementValues({ [newKey]: newItem }, elementPath);
    }
  };

  const handleAddDynamicItem = async (
    elementPath: string,
    desiredKey?: string
  ) => {
    await nextTick();
    const targetElement = elementPathMap.get(elementPath);
    if (!targetElement) return;

    const containerToTemplateMap: Record<string, string> = {
      KeyWords: "KeyWord",
      Developers: "Developer",
      AuthorizedBy: "Developer",
      ObjectsOfStandartization: "ObjectOfStandartization",
      SecurityAspects: "SecurityAspect",
      ReqObject: "ObjectOfReq",
      ObjectsOfReq: "ObjectOfReq",
      ReqLinks: "ReqLink",
      NeedDataLinks: "NeedDataLink",
      GraphView: "GraphElement",
      TableView: "TableElement",
      FormulasView: "FormulaElement",
      PropertyCond: "Condition",
      RelationCond: "Condition",
      ReqElementObjects: "ReqElementObject",
    };

    const sequence = targetElement.complexType?.sequence;
    let template: any = null;
    let templateName = "";

    const mapKey =
      desiredKey ||
      containerToTemplateMap[targetElement.name] ||
      containerToTemplateMap[
        typeof targetElement.name === "string"
          ? targetElement.name.replace(/s$/, "")
          : ""
      ];

    if (desiredKey && sequence?.[desiredKey]) {
      template = deepCopyElement(sequence[desiredKey]);
      templateName = template?.name || desiredKey;
    } else if (mapKey && dynamicTemplates[mapKey]) {
      template = deepCopyElement(dynamicTemplates[mapKey]);
      templateName = template?.name || mapKey;
    } else if (dynamicTemplates[targetElement.name]) {
      template = deepCopyElement(dynamicTemplates[targetElement.name]);
      templateName = template?.name || targetElement.name;
    } else if (sequence && Object.keys(sequence).length) {
      const firstKey = Object.keys(sequence)[0];
      template = deepCopyElement(sequence[firstKey as string]);
      templateName = template?.name || firstKey;
    }

    if (!template || !templateName) return;

    const newKey = desiredKey || `${templateName}_${Date.now()}`;
    const newItem = reactive(template);

    if ("value" in newItem) {
      newItem.value = "";
    }

    if (!targetElement.complexType) {
      targetElement.complexType = {};
    }
    if (!targetElement.complexType.sequence) {
      targetElement.complexType.sequence = {};
    }

    targetElement.complexType.sequence = reactive({
      ...targetElement.complexType.sequence,
      [newKey]: newItem,
    });

    initializeElementValues({ [newKey]: newItem }, elementPath);
  };

  const handleCopyDynamicItem = async (
    elementPath: string,
    sourceKey: string
  ) => {
    await nextTick();
    const targetElement = elementPathMap.get(elementPath);
    if (!targetElement?.complexType?.sequence?.[sourceKey]) return;

    const source = targetElement.complexType.sequence[sourceKey];
    const newKey = `${source.name || sourceKey}_${Date.now()}`;
    const copied = reactive(deepCopyElement(source));
    regenerateUids(copied, source.name || sourceKey);

    const buildEntityUidMap = (sourceLu: any, copiedLu: any) => {
      const sourceEntities =
        sourceLu?.complexType?.sequence?.Entities?.complexType?.sequence;
      const copiedEntities =
        copiedLu?.complexType?.sequence?.Entities?.complexType?.sequence;
      if (!sourceEntities || !copiedEntities) return {};

      const map: Record<string, string> = {};
      Object.keys(sourceEntities).forEach((key) => {
        const sourceEntity = sourceEntities[key];
        const copiedEntity = copiedEntities[key];
        const sourceUid = sourceEntity?.complexType?.sequence?.EntityUid?.value;
        const copiedUid = copiedEntity?.complexType?.sequence?.EntityUid?.value;
        if (sourceUid && copiedUid) {
          map[String(sourceUid)] = String(copiedUid);
        }
      });

      return map;
    };

    const remapRelationEntityRefs = (
      logicalUnit: any,
      uidMap: Record<string, string>
    ) => {
      if (!logicalUnit || !Object.keys(uidMap).length) return;
      const relations =
        logicalUnit?.complexType?.sequence?.Relations?.complexType?.sequence;
      if (!relations || typeof relations !== "object") return;

      Object.values(relations).forEach((relation: any) => {
        const sequence = relation?.complexType?.sequence;
        if (!sequence) return;

        ["HeadObjectId", "TailObjectId"].forEach((field) => {
          const target = sequence[field];
          const current = target?.value;
          if (current === undefined || current === null) return;
          const mapped = uidMap[String(current)];
          if (mapped) {
            target.value = mapped;
          }
        });
      });
    };

    if (copied?.name === "LogicalUnit") {
      const entityUidMap = buildEntityUidMap(source, copied);
      remapRelationEntityRefs(copied, entityUidMap);
    }

    targetElement.complexType.sequence = reactive({
      ...targetElement.complexType.sequence,
      [newKey]: copied,
    });

    initializeElementValues({ [newKey]: copied }, elementPath);

    const logicalUnitIdFromPath =
      elementPath.match(/LogicalUnit_\d+/)?.[0] || "";
    const isLogicalUnitCopy = copied?.name === "LogicalUnit";
    const logicalUnitId = isLogicalUnitCopy ? newKey : logicalUnitIdFromPath;
    const logicalUnitPath = isLogicalUnitCopy
      ? `${elementPath}.${newKey}`
      : logicalUnitIdFromPath
        ? getLogicalUnitPath(elementPath, logicalUnitIdFromPath)
        : null;

    if (isLogicalUnitCopy) {
      ensurePRuleLogicalUnitField(copied);
    }

    if (logicalUnitId && logicalUnitPath) {
      const pruleEntries = extractPRuleLogicalUnitEntries(copied);
      let nextLogicalUnitMap: Record<string, string> | undefined;

      if (isLogicalUnitCopy) {
        nextLogicalUnitMap = pruleEntries;
      } else if (Object.keys(pruleEntries).length) {
        nextLogicalUnitMap = {
          ...(schema.pRuleLogicalUnits?.[logicalUnitId] || {}),
          ...pruleEntries,
        };
      }

      if (nextLogicalUnitMap) {
        schema.pRuleLogicalUnits = {
          ...(schema.pRuleLogicalUnits || {}),
          [logicalUnitId]: nextLogicalUnitMap,
        };
      }

      const pruleValue = buildPRuleLogicalUnitValue(
        nextLogicalUnitMap || schema.pRuleLogicalUnits?.[logicalUnitId]
      );
      updateElementValue(`${logicalUnitPath}.PRuleLogicalUnit`, pruleValue);
    }
  };

  const handleAddConditionElement = async (
    elementPath: string,
    condName: "PropertyCond" | "RelationCond"
  ) => {
    await nextTick();
    const targetElement = elementPathMap.get(elementPath);
    if (!targetElement) return;

    if (targetElement.complexType?.sequence?.[condName]) {
      return; // только один элемент
    }

    const conditionTemplate =
      schema.complexTypes?.ConditionType || schema.complexTypes?.Condition;

    const template =
      dynamicTemplates[condName] ||
      (conditionTemplate
        ? {
            name: condName,
            complexType: deepCopyElement(conditionTemplate),
          }
        : dynamicTemplates.Condition);
    if (!template) return;

    const newItem = reactive(deepCopyElement(template));

    if (!targetElement.complexType) {
      targetElement.complexType = {};
    }
    if (!targetElement.complexType.sequence) {
      targetElement.complexType.sequence = {};
    }

    targetElement.complexType.sequence[condName] = newItem;
    applyConditionTypeToCondFields({ [condName]: newItem });
    clearElementValues(newItem);
    generateUniqueIds(newItem, "Condition");
    initializeElementValues({ [condName]: newItem }, elementPath);
  };

  const handleRemoveConditionElement = (
    elementPath: string,
    condName: "PropertyCond" | "RelationCond"
  ) => {
    const targetElement = elementPathMap.get(elementPath);
    const condElement = targetElement?.complexType?.sequence?.[condName];
    if (!condElement || !targetElement?.complexType?.sequence) return;

    const logicalUnitId = elementPath.match(/LogicalUnit_\d+/)?.[0] as
      | string
      | undefined;
    const condUid =
      condElement?.complexType?.sequence?.ConditionUid?.value || null;

    if (logicalUnitId && condUid && schema.pRuleLogicalUnits?.[logicalUnitId]) {
      const nextPruMap = { ...schema.pRuleLogicalUnits };
      const luMap = { ...nextPruMap[logicalUnitId] };
      if (luMap[condUid]) {
        delete luMap[condUid];
      }
      if (Object.keys(luMap).length) {
        nextPruMap[logicalUnitId] = luMap;
      } else {
        delete nextPruMap[logicalUnitId];
      }
      schema.pRuleLogicalUnits = nextPruMap;
    }

    delete targetElement.complexType.sequence[condName];
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
    const shouldGenerateUid =
      isUidFieldName(element.name) &&
      (element.value === undefined ||
        element.value === "" ||
        element.value === null);

    if (shouldGenerateUid) {
      element.value = generateUid(
        element.name || itemType,
        element.simpleType?.restriction?.pattern
      );
    }

    if (element.complexType?.attributes) {
      Object.values(element.complexType.attributes).forEach((attr: any) => {
        const shouldGenerateAttrUid =
          isUidFieldName(attr.name) &&
          (attr.value === undefined ||
            attr.value === "" ||
            attr.value === null);

        if (shouldGenerateAttrUid) {
          attr.value = generateUid(
            attr.name || itemType,
            attr.simpleType?.restriction?.pattern
          );
        }
      });
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

  const regenerateUids = (element: any, itemType: string) => {
    if (!element || typeof element !== "object") return;

    if (isUidFieldName(element.name)) {
      element.value = generateUid(
        element.name || itemType,
        element.simpleType?.restriction?.pattern
      );
    }

    if (element.complexType?.attributes) {
      Object.values(element.complexType.attributes).forEach((attr: any) => {
        if (isUidFieldName(attr.name)) {
          const baseName =
            attr.name === "ReqElementUId" ||
            attr.name === "ReqElementUid" ||
            attr.name === "ReqElementUID"
              ? itemType
              : attr.name || itemType;
          attr.value = generateUid(
            baseName,
            attr.simpleType?.restriction?.pattern
          );
        }
      });
    }

    if (element.complexType?.sequence) {
      Object.values(element.complexType.sequence).forEach((child: any) =>
        regenerateUids(child, itemType)
      );
    }
    if (element.complexType?.all) {
      Object.values(element.complexType.all).forEach((child: any) =>
        regenerateUids(child, itemType)
      );
    }
    if (element.complexType?.choice?.elements) {
      Object.values(element.complexType.choice.elements).forEach((child: any) =>
        regenerateUids(child, itemType)
      );
    }
    if (element.complexType?.complexContent?.extension?.sequence) {
      Object.values(
        element.complexType.complexContent.extension.sequence
      ).forEach((child: any) => regenerateUids(child, itemType));
    }
  };

  const generateXML = () => {
    try {
      syncPRulesWithLogicalUnits();
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
    handleAddDynamicItem,
    handleCopyDynamicItem,
    handleAddConditionElement,
    handleRemoveConditionElement,
  };
}
