import * as builder from "xmlbuilder";
import type { XSDElement, XSDSchema } from "@/types";

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
    currentNode.txt(String(element.value));
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
      const value = (child as XSDElement).value;
      if (value !== undefined && value !== null && value !== "") {
        currentNode.att(attrKey, String(value));
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

    const reqElementFields = [
      "ReqElementData",
      "ReqElementNumber",
      "ReqElementName",
      "ReqElementLink",
      "ReqElementNotes",
    ];

    let hasReqElementContent = false;
    
    for (const field of reqElementFields) {
      const fieldValue = complexValue[field];
      if (
        fieldValue !== undefined &&
        fieldValue !== null &&
        fieldValue !== ""
      ) {
        hasReqElementContent = true;
        const fieldNode = parent.ele(field);

        if (
          field === "ReqElementData" &&
          (complexValue.attributes?.ReqElementType ===
            "графическое изображение" ||
            complexValue.attributes?.ReqElementType === "формульная запись")
        ) {
          if (fieldValue.includes("<") && fieldValue.includes(">")) {
            fieldNode.cdata(fieldValue);
          } else {
            fieldNode.txt(fieldValue);
          }
        } else {
          fieldNode.txt(fieldValue);
        }
      }
    }
    
    // Если нет контента в ReqElement, не создаем его
    if (!hasReqElementContent && 
        (!complexValue.attributes || 
         Object.keys(complexValue.attributes).length === 0 ||
         !Object.values(complexValue.attributes).some((attr: any) => 
           attr !== undefined && attr !== null && attr !== ""
         ))
    ) {
      return;
    }
  } else {
    let hasComplexContent = false;
    
    for (const [key, value] of Object.entries(complexValue)) {
      if (key === "attributes") continue;

      if (value !== undefined && value !== null && value !== "") {
        hasComplexContent = true;
        const fieldNode = parent.ele(key);

        if (typeof value === "object" && !Array.isArray(value)) {
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
    // Проверяем поля ReqElement
    const reqElementFields = [
      "ReqElementData",
      "ReqElementNumber",
      "ReqElementName",
      "ReqElementLink",
      "ReqElementNotes"
    ];
    
    const hasReqField = reqElementFields.some(field => 
      reqValue[field] !== undefined && 
      reqValue[field] !== null && 
      reqValue[field] !== ""
    );
    
    const hasAttribute = reqValue.attributes && 
      Object.values(reqValue.attributes).some((attr: any) => 
        attr !== undefined && attr !== null && attr !== ""
      );
    
    return hasReqField || hasAttribute;
  }
  
  return false;
}
