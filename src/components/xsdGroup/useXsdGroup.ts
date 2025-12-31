import { computed, inject, nextTick, ref, watch } from "vue";
import type { ComplexTypeInstance, XSDElement, XSDSchema } from "@/types";
import {
  canRemoveItem,
  getInputType,
  getNestedValue,
  isComplexType,
  isKSIIdentificationField,
  isUidFieldName,
} from "@/utils/xsdUtils";

export interface XsdGroupProps {
  element: any;
  level: number;
  parentPath?: string;
  currentEntityPath?: string;
  isAttributeValue?: boolean;
}

export interface XsdGroupEmits {
  (e: "update-value", path: string, value: any): void;
  (e: "add-entity", path: string): void;
  (e: "add-property", path: string): void;
  (e: "add-relation", path: string): void;
  (e: "add-logical-unit", path: string): void;
  (e: "add-dynamic-item", path: string, desiredKey?: string): void;
  (e: "copy-dynamic-item", path: string, key: string): void;
  (
    e: "add-condition",
    path: string,
    condName: "PropertyCond" | "RelationCond"
  ): void;
  (
    e: "remove-condition",
    path: string,
    condName: "PropertyCond" | "RelationCond"
  ): void;
}

export function useXsdGroup(props: XsdGroupProps, emit: XsdGroupEmits) {
  const schema: Partial<XSDSchema> = inject("schema", {});
  const mockData: Record<string, any[]> = inject("mockData", {});

  const isExpanded = ref(true);
  const selectedComplexTypeId = ref("");

  const currentPath = computed(() => {
    return props.parentPath || props.element.name;
  });

  const logicalUnitPath = computed(() => {
    const parts = currentPath.value.split(".");
    const luIndex = parts.findIndex((part: string) =>
      part.startsWith("LogicalUnit_")
    );
    if (luIndex === -1) return null;
    return parts.slice(0, luIndex + 1).join(".");
  });

  const entityNameByUid = computed(() => {
    if (!logicalUnitPath.value) return {};

    const items = getNestedValue(
      schema,
      `elements.${logicalUnitPath.value}.complexType.sequence.Entities.complexType.sequence`
    ) as Record<string, XSDElement> | undefined;

    if (!items || typeof items !== "object") {
      return {};
    }

    const map: Record<string, string> = {};
    Object.values(items).forEach((item: any) => {
      const uid = item?.complexType?.sequence?.EntityUid?.value;
      const name = item?.complexType?.sequence?.EntityName?.value;
      if (uid) {
        map[String(uid)] = String(name || uid);
      }
    });

    return map;
  });

  const relationSummaryLines = computed(() => {
    if (props.element?.name !== "Relation") return [];

    const relation = props.element;
    const relationAttrs = relation?.complexType?.attributes;
    const relationType = relationAttrs?.TypeOfRelation?.value;

    const headUid = relation?.complexType?.sequence?.HeadObjectId?.value;
    const tailUid = relation?.complexType?.sequence?.TailObjectId?.value;
    const headName =
      (headUid && entityNameByUid.value[String(headUid)]) ||
      (headUid ? String(headUid) : "");
    const tailName =
      (tailUid && entityNameByUid.value[String(tailUid)]) ||
      (tailUid ? String(tailUid) : "");

    const basePrefix = [headName, tailName].filter(Boolean).join(" → ");
    const base = relationType
      ? basePrefix
        ? `${basePrefix}: ${relationType}`
        : String(relationType)
      : basePrefix
      ? `${basePrefix}:`
      : "";

    const sequence = relation?.complexType?.sequence || {};
    const condItems = Object.values(sequence).filter(
      (item: any) => item?.name === "RelationCond"
    );

    const buildConditionSuffix = (cond: any) => {
      const choice = cond?.complexType?.choice;
      const choiceElements = choice?.elements || {};
      const selectedKey =
        choice?.selectedKey || Object.keys(choiceElements || {})[0];
      if (!selectedKey || !choiceElements[selectedKey]) return "";

      const selected = choiceElements[selectedKey];
      if (selectedKey === "ValueFromListCondition") {
        const valueNode = selected?.complexType?.sequence?.ValueFromList;
        const rawValue = valueNode?.value;
        const values = Array.isArray(rawValue)
          ? rawValue.filter(Boolean).map(String)
          : rawValue
          ? [String(rawValue)]
          : [];
        return values.length ? `, ${values.join(", ")}` : "";
      }

      if (selectedKey === "ComputableCondition") {
        const expr =
          selected?.complexType?.sequence?.ConditionExpression?.value;
        const units =
          selected?.complexType?.sequence?.UnitsOfMeasurement?.value;
        let text = expr ? ` = ${expr}` : "";
        if (units) {
          text += `${text ? ", " : " "}единицы измерения: ${units}`;
        }
        return text;
      }

      if (
        selectedKey === "EqualityCondition" ||
        selectedKey === "ComparisonCondition"
      ) {
        const typeOfCondition =
          selected?.complexType?.attributes?.TypeOfCondition?.value;
        const value = selected?.complexType?.sequence?.Value?.value;
        const units =
          selected?.complexType?.sequence?.UnitsOfMeasurement?.value;
        const parts = [typeOfCondition, value, units]
          .filter((part) => part !== undefined && part !== null && part !== "")
          .map(String);
        return parts.length ? ` ${parts.join(" ")}` : "";
      }

      return "";
    };

    if (!condItems.length) {
      return base ? [base] : [];
    }

    return condItems
      .map((cond: any) => {
        const suffix = buildConditionSuffix(cond);
        return base ? `${base}${suffix}` : suffix.trim();
      })
      .filter((line: string) => line);
  });

  const hasComplexTypeValue = computed(() => {
    return (
      props.element.value &&
      typeof props.element.value === "object" &&
      Object.keys(props.element.value).length > 0
    );
  });

  const isFormulaElementDataField = computed(() => {
    if (props.element.name !== "ReqElementData") return false;
    const segments = currentPath.value.split(".");
    return segments.some((segment: string) =>
      segment.includes("FormulaElement")
    );
  });

  const formulaSelectOptions = computed(() => {
    return mockData.FormulaElementData || [];
  });

  const isGraphElementDataField = computed(() => {
    if (props.element.name !== "ReqElementData") return false;
    const segments = currentPath.value.split(".");
    return segments.some((segment: string) =>
      segment.includes("GraphElement")
    );
  });

  const graphSelectOptions = computed(() => {
    return mockData.GraphElementData || [];
  });

  const isTableElementDataField = computed(() => {
    if (props.element.name !== "ReqElementData") return false;
    const segments = currentPath.value.split(".");
    return segments.some((segment: string) =>
      segment.includes("TableElement")
    );
  });

  const tableSelectOptions = computed(() => {
    return mockData.TableElementData || [];
  });

  const decodeMarkupValue = (value: string) => {
    if (typeof window === "undefined") return value;
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  };

  const formulaPreview = computed(() => {
    if (!isFormulaElementDataField.value) return "";
    const rawValue = props.element.value;
    if (!rawValue) return "";
    const decoded = decodeMarkupValue(String(rawValue)).trim();
    if (!decoded) return "";
    return decoded.startsWith("<math")
      ? decoded
      : `<math xmlns="http://www.w3.org/1998/Math/MathML">${decoded}</math>`;
  });

  const graphPreview = computed(() => {
    if (!isGraphElementDataField.value) return "";
    const rawValue = props.element.value;
    if (!rawValue) return "";
    return decodeMarkupValue(String(rawValue)).trim();
  });

  const tablePreview = computed(() => {
    if (!isTableElementDataField.value) return "";
    const rawValue = props.element.value;
    if (!rawValue) return "";
    return decodeMarkupValue(String(rawValue)).trim();
  });

  const availableMockInstances = computed(() => {
    if (!props.element.type) return [];
    const data = mockData[props.element.type as keyof typeof mockData] || [];
    if (props.element.type === "KSIIdentification") {
      if (props.element.name === "PropertyID") {
        return data.filter((d) => d.data.KSITableCode === "Prp");
      } else return data.filter((d) => d.data.KSITableCode !== "Prp");
    } else return data;
  });

  const isEntitiesOrPropertiesOrRelations = computed(() => {
    const dynamicAddables = [
      "Entities",
      "Properties",
      "Relations",
      "LogicalUnits",
      "KeyWords",
      "AuthorizedBy",
      "ObjectsOfStandartization",
      "SecurityAspects",
      "ObjectsOfReq",
      "ReqObject",
      "ReqLinks",
      "NeedDataLinks",
      "GraphView",
      "TableView",
      "FormulasView",
      "ReqElementObjects",
    ];

    return dynamicAddables.includes(props.element.name);
  });

  const LINK_SELECT_FIELDS = ["NameOfSourceDocument", "LinkReqUid"];

  const isLinkElement = (element: any) => {
    return !!element?.complexType?.attributes?.LinkType;
  };

  const isInternalLink = (element: any) => {
    const linkType = element?.complexType?.attributes?.LinkType?.value;
    return isLinkElement(element) && linkType === "внутренняя";
  };

  const isLinkSelectField = (parent: any, child: any) => {
    return isInternalLink(parent) && LINK_SELECT_FIELDS.includes(child?.name);
  };

  const getLinkSelectOptions = (fieldName: string) => {
    if (fieldName === "NameOfSourceDocument") {
      return mockData.LinkNameOfSourceDocument || [];
    }
    if (fieldName === "LinkReqUid") {
      return mockData.LinkReqUid || [];
    }
    return [];
  };

  const isPRuleContext = (path: string) => {
    const segments = path.split(".");
    return (
      path.includes("PLOGIC") &&
      path.includes("PRules") &&
      segments.some((segment) => /^PRule/.test(segment))
    );
  };

  const isPRuleFieldDisabled = (
    target: any,
    path: string,
    nameOverride?: string
  ) => {
    if (!isPRuleContext(path)) return false;
    const fieldName = nameOverride || target?.name;
    return fieldName !== "PRuleNotes";
  };

  const onComplexTypeSelected = () => {
    const instance = availableMockInstances.value.find(
      (inst: ComplexTypeInstance) => inst.id === selectedComplexTypeId.value
    );

    emit("update-value", currentPath.value, instance?.data);
  };

  const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value;
  };

  const getItemPath = (key: string): string => {
    return `${currentPath.value}.${key}`;
  };

  const getComplexTypeDefinition = (typeName: string) => {
    return schema?.complexTypes?.[typeName];
  };

  const handleSelectEntity = (value: string | undefined) => {
    emit("update-value", currentPath.value, value);
  };

  const handleInputChange = (value?: string | number | boolean) => {
    const currentValue = props.isAttributeValue ? { attributes: value } : value;
    emit("update-value", currentPath.value, currentValue);
  };

  const handleFormulaSelect = (value?: string) => {
    handleInputChange(value || "");
  };

  const handleGraphSelect = (value?: string) => {
    handleInputChange(value || "");
  };

  const handleTableSelect = (value?: string) => {
    handleInputChange(value || "");
  };

  const handleChildUpdate = (path: string, value: any) => {
    emit("update-value", path, value);
  };

  function handleAddElement(name: string) {
    if (name === "Entities") {
      handleAddEntity();
    } else if (name === "Properties" && props.currentEntityPath) {
      handleAddProperty();
    } else if (name === "Relations") {
      handleAddRelation();
    } else if (name === "LogicalUnits") {
      handleAddLogicalUnit();
    } else {
      handleAddDynamic();
    }
  }

  const handleAddEntity = async () => {
    await nextTick();
    emit("add-entity", currentPath.value);
  };

  const handleAddProperty = async () => {
    await nextTick();
    emit("add-property", currentPath.value);
  };

  const handleAddLogicalUnit = async () => {
    await nextTick();
    emit("add-logical-unit", currentPath.value);
  };

  const handleAddRelation = async () => {
    await nextTick();
    emit("add-relation", currentPath.value);
  };

  const handleAddDynamic = async (path?: string, desiredKey?: string) => {
    await nextTick();
    emit("add-dynamic-item", path || currentPath.value, desiredKey);
  };

  const handleAddCondition = (condName: "PropertyCond" | "RelationCond") => {
    emit("add-condition", currentPath.value, condName);
  };

  const handleRemoveCondition = (condName: "PropertyCond" | "RelationCond") => {
    emit("remove-condition", currentPath.value, condName);
  };

  const handleChildAddEntity = (path: string) => {
    emit("add-entity", path);
  };

  const handleChildAddProperty = (path: string) => {
    emit("add-property", path);
  };

  const handleChildAddRelation = (path: string) => {
    emit("add-relation", path);
  };

  const handleChildAddDynamic = (path: string, desiredKey?: string) => {
    emit("add-dynamic-item", path, desiredKey);
  };

  const handleCopyItem = (key: string) => {
    emit("copy-dynamic-item", currentPath.value, key);
  };

  const handleChildAddCondition = (
    path: string,
    condName: "PropertyCond" | "RelationCond"
  ) => {
    emit("add-condition", path, condName);
  };

  const handleChildRemoveCondition = (
    path: string,
    condName: "PropertyCond" | "RelationCond"
  ) => {
    emit("remove-condition", path, condName);
  };

  const removeItemDependencies = (
    item: XSDElement,
    logicalUnitId: string | undefined
  ) => {
    if (logicalUnitId && schema.pRuleLogicalUnits?.[logicalUnitId]) {
      const luMap = { ...schema.pRuleLogicalUnits[logicalUnitId] };
      const relationUid = item?.complexType?.sequence?.RelationUid?.value;
      const relationCondUid =
        item?.complexType?.sequence?.RelationCond?.complexType?.sequence
          ?.ConditionUid?.value;
      const propertyCondUid =
        item?.complexType?.sequence?.PropertyCond?.complexType?.sequence
          ?.ConditionUid?.value;

      if (relationUid && luMap[relationUid]) {
        delete luMap[relationUid];
      }
      if (relationCondUid && luMap[relationCondUid]) {
        delete luMap[relationCondUid];
      }
      if (propertyCondUid && luMap[propertyCondUid]) {
        delete luMap[propertyCondUid];
      }

      const nextPruMap = { ...schema.pRuleLogicalUnits };
      if (Object.keys(luMap).length) {
        nextPruMap[logicalUnitId] = luMap;
      } else {
        delete nextPruMap[logicalUnitId];
      }
      schema.pRuleLogicalUnits = nextPruMap;
    }
  };

  const removeItem = async (key: string) => {
    const item = props.element.complexType?.sequence?.[key];
    if (item && canRemoveItem(item.name) && !isKSIIdentificationField(item)) {
      const removedPath = getItemPath(String(key));
      const logicalUnitId = removedPath.match(/LogicalUnit_\d+/)?.[0] as string;
      if (
        item.name === "LogicalUnit" &&
        schema.pRuleLogicalUnits?.[logicalUnitId]
      ) {
        delete schema.pRuleLogicalUnits[logicalUnitId];
      } else if (item.name === "Entity") {
        const { Properties } = item?.complexType?.sequence;
        Object.keys(Properties?.complexType?.sequence).forEach((entityKey) => {
          if (entityKey) {
            removeItemDependencies(
              Properties.complexType.sequence[entityKey],
              logicalUnitId
            );
          }
        });
      } else {
        removeItemDependencies(item, logicalUnitId);
      }
      await nextTick();
      delete props.element.complexType.sequence[key];
    }
  };

  watch(
    () => props.element.value,
    (newValue) => {
      if (newValue && props.element.type && isComplexType(props.element.type)) {
        const instances = availableMockInstances.value;
        const matchingInstance = instances.find((inst: ComplexTypeInstance) => {
          return JSON.stringify(inst.data) === JSON.stringify(newValue);
        });

        if (matchingInstance) {
          selectedComplexTypeId.value = matchingInstance.id;
        }
      }
    },
    { immediate: true }
  );

  return {
    schema,
    mockData,
    isExpanded,
    selectedComplexTypeId,
    currentPath,
    relationSummaryLines,
    hasComplexTypeValue,
    isFormulaElementDataField,
    formulaSelectOptions,
    isGraphElementDataField,
    graphSelectOptions,
    isTableElementDataField,
    tableSelectOptions,
    formulaPreview,
    graphPreview,
    tablePreview,
    availableMockInstances,
    isEntitiesOrPropertiesOrRelations,
    isLinkSelectField,
    getLinkSelectOptions,
    isPRuleFieldDisabled,
    onComplexTypeSelected,
    toggleExpanded,
    getItemPath,
    getComplexTypeDefinition,
    handleSelectEntity,
    handleInputChange,
    handleFormulaSelect,
    handleGraphSelect,
    handleTableSelect,
    handleChildUpdate,
    handleAddElement,
    handleAddEntity,
    handleAddProperty,
    handleAddRelation,
    handleAddLogicalUnit,
    handleAddDynamic,
    handleAddCondition,
    handleRemoveCondition,
    handleChildAddEntity,
    handleChildAddProperty,
    handleChildAddRelation,
    handleChildAddDynamic,
    handleCopyItem,
    handleChildAddCondition,
    handleChildRemoveCondition,
    removeItem,
    canRemoveItem,
    isKSIIdentificationField,
    isComplexType,
    isUidFieldName,
    getInputType,
  };
}
