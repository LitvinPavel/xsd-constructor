import * as builder from "xmlbuilder";
import type { XSDElement, XSDSchema } from "@/types";

const DATE_VALUE_REGEX =
  /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?$/;

const normalizeDateValue = (value: unknown, type?: string): string | null => {
  if (value === null || value === undefined || value === "") return null;

  const pad = (num: number) => String(num).padStart(2, "0");
  const buildFromParts = (
    year?: number | string,
    month?: number | string,
    day?: number | string,
    hours?: number | string,
    minutes?: number | string
  ) => {
    const datePart = `${pad(Number(day))}.${pad(Number(month))}.${year}`;
    if (type === "xs:time" || type === "time") {
      if (hours === undefined || minutes === undefined) return null;
      return `${pad(Number(hours))}:${pad(Number(minutes))}`;
    }
    if (
      type === "xs:dateTime" ||
      type === "datetime-local" ||
      type === "time"
    ) {
      if (hours === undefined || minutes === undefined) return `${datePart}T00:00:00`;
      return `${datePart}T${pad(Number(hours))}:${pad(Number(minutes))}`;
    }
    return datePart;
  };

  if (value instanceof Date) {
    return buildFromParts(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
      value.getHours(),
      value.getMinutes()
    );
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(DATE_VALUE_REGEX);
    if (match) {
      const [, dd, mm, yyyy, hh, min] = match;
      return buildFromParts(yyyy, mm, dd, hh, min);
    }
    return trimmed;
  }

  return String(value);
};

const formatValueByType = (value: unknown, type?: string): string | null => {
  if (value === null || value === undefined || value === "") return null;

  if (type === "xs:date" || type === "date") {
    return normalizeDateValue(value, "xs:date");
  }

  if (type === "xs:dateTime" || type === "datetime-local") {
    return normalizeDateValue(value, "xs:dateTime");
  }

  if (type === "xs:time" || type === "time") {
    return normalizeDateValue(value, "xs:time");
  }

  return String(value);
};

const shouldWrapCdata = (value: unknown, type?: string): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed.includes("<") || !trimmed.includes(">")) return false;

  const normalizedType = type?.toLowerCase?.() || "";
  if (normalizedType === "xs:string" || normalizedType === "string" || !type) {
    return true;
  }

  return false;
};

export function generateXMLWithValidation(schema: XSDSchema): string {
  if (!schema?.elements || Object.keys(schema.elements).length === 0) {
    throw new Error("Invalid schema: no elements found");
  }

  const rootElementKey = Object.keys(schema.elements)[0];
  const rootElement = schema.elements[rootElementKey as string];

  if (
    !rootElement ||
    !rootElement.name ||
    typeof rootElement.name !== "string"
  ) {
    throw new Error("Invalid root element: name is required");
  }

  try {
    const xml = builder.create(rootElement.name, {
      version: "1.0",
      encoding: "UTF-8",
    });

    if (rootElement.complexType?.sequence) {
      for (const [_key, childElement] of Object.entries(
        rootElement.complexType.sequence
      )) {
        if (childElement?.skipInXml) continue;
        if (childElement?.name && hasContent(childElement)) {
          processElementWithValidation(xml, childElement);
        }
      }
    }

    return xml.end({ pretty: true, indent: "  ", newline: "\n" });
  } catch (error) {
    throw new Error(`XML generation failed: ${(error as Error).message}`);
  }
}

function processElementWithValidation(parent: any, element: any): void {
  if (!element || !element.name || element.skipInXml) return;

  // Проверяем, есть ли содержание у элемента
  if (!hasContent(element)) {
    return;
  }

  const currentNode = parent.ele(element.name);

  if (element.complexType?.complexContent && element.value) {
    processComplexTypeByDefinition(
      currentNode,
      element.type,
      element.value,
      element
    );
  } else if (element.type && isComplexType(element.type) && element.value) {
    processComplexTypeByDefinition(
      currentNode,
      element.type,
      element.value,
      element
    );
  } else if (
    element.value !== undefined &&
    element.value !== null &&
    element.value !== "" &&
    !element.complexType &&
    !isComplexType(element.type)
  ) {
    const formattedValue = formatValueByType(element.value, element.type);
    if (formattedValue !== null) {
      if (shouldWrapCdata(formattedValue, element.type)) {
        currentNode.cdata(formattedValue);
      } else currentNode.txt(formattedValue);
      
    }
  }

  // Обработка дочерних элементов
  let hasChildContent = false;
  
  if (element.complexType?.complexContent?.extension?.sequence) {
    for (const [_childKey, child] of Object.entries(
      element.complexType.complexContent.extension.sequence
    )) {
      if ((child as XSDElement)?.skipInXml) continue;
      if ((child as XSDElement)?.name && hasContent(child)) {
        hasChildContent = true;
        processElementWithValidation(currentNode, child);
      }
    }
  }

  if (element.complexType?.sequence) {
    for (const [_childKey, child] of Object.entries(
      element.complexType.sequence
    )) {
      if ((child as XSDElement)?.skipInXml) continue;
      if ((child as XSDElement)?.name && hasContent(child)) {
        hasChildContent = true;
        processElementWithValidation(currentNode, child);
      }
    }
  }

  const selectedChoice = getSelectedChoiceChild(element);
  if (selectedChoice?.child) {
    if ((selectedChoice.child as XSDElement)?.skipInXml) {
      // skip
    } else if (hasContent(selectedChoice.child)) {
      hasChildContent = true;
      processElementWithValidation(currentNode, selectedChoice.child);
    }
  }

  if (element.complexType?.all) {
    for (const [_childKey, child] of Object.entries(element.complexType.all)) {
      if ((child as XSDElement)?.skipInXml) continue;
      if ((child as XSDElement)?.name && hasContent(child)) {
        hasChildContent = true;
        processElementWithValidation(currentNode, child);
      }
    }
  }

  if (element.complexType?.attributes) {
    for (const [attrKey, child] of Object.entries(
      element.complexType.attributes
    )) {
      const value = formatValueByType(
        (child as XSDElement).value,
        (child as XSDElement).type
      );
      if (value !== null) {
        currentNode.att(attrKey, value);
      }
    }
  }

  // Если у элемента нет контента (значения и дочерних элементов), удаляем его
  if (!hasChildContent && 
      (!element.value || element.value === "" || element.value === null || element.value === undefined) &&
      (!element.complexType?.attributes || 
       Object.keys(element.complexType.attributes).length === 0 ||
       !Object.values(element.complexType.attributes).some((attr: any) => 
         attr.value !== undefined && attr.value !== null && attr.value !== ""
       ))
  ) {
    // xmlbuilder не поддерживает удаление узлов, поэтому проверяем перед созданием
    return;
  }
}

function processComplexTypeByDefinition(
  parent: any,
  _typeName: string,
  complexValue: any,
  elementDefinition?: any
): void {
  if (!complexValue || typeof complexValue !== "object") return;

  if (
    elementDefinition?.complexType?.complexContent?.extension?.base ===
    "ReqElement"
  ) {
    if (complexValue.attributes) {
      for (const [attrKey, attrValue] of Object.entries(
        complexValue.attributes
      )) {
        if (attrValue !== undefined && attrValue !== null && attrValue !== "") {
          parent.att(attrKey, String(attrValue));
        }
      }
    }

    let hasReqElementContent = false;

    for (const [field, fieldValue] of Object.entries(complexValue)) {
      if (field === "attributes") continue;
      if (fieldValue === undefined || fieldValue === null || fieldValue === "")
        continue;

      hasReqElementContent = true;
      const fieldNode = parent.ele(field);

      if (shouldWrapCdata(fieldValue, elementDefinition?.type)) {
        fieldNode.cdata(fieldValue);
      } else if (typeof fieldValue === "object" && !Array.isArray(fieldValue)) {
        processComplexTypeValue(fieldNode, fieldValue);
      } else {
        fieldNode.txt(String(fieldValue));
      }
    }

    const hasAttributeContent =
      complexValue.attributes &&
      Object.values(complexValue.attributes).some(
        (attr: any) => attr !== undefined && attr !== null && attr !== ""
      );

    // Если нет контента в ReqElement, не создаем его
    if (!hasReqElementContent && !hasAttributeContent) {
      return;
    }
  } else {
    let hasComplexContent = false;
    
    for (const [key, value] of Object.entries(complexValue)) {
      if (key === "attributes") continue;

      if (value !== undefined && value !== null && value !== "") {
        hasComplexContent = true;
        const fieldNode = parent.ele(key);

        if (shouldWrapCdata(value, elementDefinition?.type)) {
          fieldNode.cdata(String(value));
        } else if (typeof value === "object" && !Array.isArray(value)) {
          processComplexTypeValue(fieldNode, value);
        } else {
          fieldNode.txt(String(value));
        }
      }
    }

    if (complexValue.attributes) {
      for (const [attrKey, attrValue] of Object.entries(
        complexValue.attributes
      )) {
        if (attrValue !== undefined && attrValue !== null && attrValue !== "") {
          hasComplexContent = true;
          parent.att(attrKey, String(attrValue));
        }
      }
    }
    
    // Если нет контента в complex type, не создаем его
    if (!hasComplexContent) {
      return;
    }
  }
}

function processComplexTypeValue(parent: any, complexValue: any): void {
  if (!complexValue || typeof complexValue !== "object") return;

  let hasContent = false;
  
  for (const [key, value] of Object.entries(complexValue)) {
    if (key === "attributes") continue;

    if (value !== undefined && value !== null && value !== "") {
      hasContent = true;
      const fieldNode = parent.ele(key);

      if (typeof value === "object" && !Array.isArray(value)) {
        processComplexTypeValue(fieldNode, value);
      } else if (shouldWrapCdata(value)) {
        fieldNode.cdata(String(value));
      } else {
        fieldNode.txt(String(value));
      }
    }
  }

  if (complexValue.attributes) {
    for (const [attrKey, attrValue] of Object.entries(
      complexValue.attributes
    )) {
      if (attrValue !== undefined && attrValue !== null && attrValue !== "") {
        hasContent = true;
        parent.att(attrKey, String(attrValue));
      }
    }
  }
  
  // Если нет контента, не создаем элемент
  if (!hasContent) {
    return;
  }
}

function getSelectedChoiceChild(element: any): { key: string; child: any } | null {
  const choice = element?.complexType?.choice;
  if (!choice?.elements) return null;

  const key = choice.selectedKey || Object.keys(choice.elements)[0];
  if (!key) return null;

  return { key, child: choice.elements[key] };
}

function isComplexType(typeName?: string): boolean {
  if (!typeName) return false;
  const complexTypes = [
    "KSIIdentification",
    "Condition",
    "Organization",
    "Link",
    "ReqElement",
  ];
  return complexTypes.includes(typeName);
}

/**
 * Проверяет, имеет ли элемент какое-либо содержание
 * (значение, атрибуты или дочерние элементы с содержанием)
 */
function hasContent(element: any): boolean {
  if (!element) return false;
  if (element.skipInXml) return false;

  // Проверяем простое значение
  if (element.value !== undefined && 
      element.value !== null && 
      element.value !== "") {
    return true;
  }
  
  // Проверяем атрибуты
  if (element.complexType?.attributes) {
    const hasAttributeValue = Object.values(element.complexType.attributes)
      .some((attr: any) => 
        attr.value !== undefined && 
        attr.value !== null && 
        attr.value !== ""
      );
    if (hasAttributeValue) return true;
  }
  
  // Рекурсивно проверяем дочерние элементы
  if (element.complexType?.complexContent?.extension?.sequence) {
    const hasChildContent = Object.values(element.complexType.complexContent.extension.sequence)
      .some((child: any) => hasContent(child));
    if (hasChildContent) return true;
  }
  
  if (element.complexType?.sequence) {
    const hasChildContent = Object.values(element.complexType.sequence)
      .some((child: any) => hasContent(child));
    if (hasChildContent) return true;
  }

  const choice = element.complexType?.choice;
  if (choice?.elements) {
    const key = choice.selectedKey || Object.keys(choice.elements)[0];
    const choiceChild = key ? choice.elements[key] : undefined;
    if (choiceChild && hasContent(choiceChild)) {
      return true;
    }
  }
  
  if (element.complexType?.all) {
    const hasChildContent = Object.values(element.complexType.all)
      .some((child: any) => hasContent(child));
    if (hasChildContent) return true;
  }
  
  if (element.complexType?.choice?.elements) {
    const hasChildContent = Object.values(element.complexType.choice.elements)
      .some((child: any) => hasContent(child));
    if (hasChildContent) return true;
  }
  
  // Для complex type с данными
  if (element.type && isComplexType(element.type) && element.value) {
    return true;
  }
  
  // Для ReqElement extension
  if (element.complexType?.complexContent?.extension?.base === "ReqElement" && element.value) {
    const reqValue = element.value;
    const hasValueDeep = (val: any): boolean => {
      if (val === undefined || val === null || val === "") return false;
      if (typeof val === "object" && !Array.isArray(val)) {
        return Object.values(val).some((nested) => hasValueDeep(nested));
      }
      if (Array.isArray(val)) {
        return val.some((item) => hasValueDeep(item));
      }
      return true;
    };

    const hasReqField = Object.entries(reqValue)
      .filter(([key]) => key !== "attributes")
      .some(([, val]) => hasValueDeep(val));
    
    const hasAttribute = reqValue.attributes && 
      Object.values(reqValue.attributes).some((attr: any) => 
        attr !== undefined && attr !== null && attr !== ""
      );
    
    return hasReqField || hasAttribute;
  }
  
  return false;
}
