// utils/xmlGenerator.ts
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
        if (childElement?.name) {
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
  if (!element || !element.name) return;

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

  if (element.complexType?.complexContent?.extension?.sequence) {
    for (const [_childKey, child] of Object.entries(
      element.complexType.complexContent.extension.sequence
    )) {
      processElementWithValidation(currentNode, child);
    }
  }

  if (element.complexType?.sequence) {
    for (const [_childKey, child] of Object.entries(
      element.complexType.sequence
    )) {
      processElementWithValidation(currentNode, child);
    }
  }

  if (element.complexType?.all) {
    for (const [_childKey, child] of Object.entries(element.complexType.all)) {
      processElementWithValidation(currentNode, child);
    }
  }

  if (element.complexType?.attributes) {
    for (const [_childKey, child] of Object.entries(
      element.complexType.attributes
    )) {
      const value = (child as XSDElement).value;
      if (value) {
        currentNode.att(_childKey, String(value));
      }
    }
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

    for (const field of reqElementFields) {
      const fieldValue = complexValue[field];
      if (
        fieldValue !== undefined &&
        fieldValue !== null &&
        fieldValue !== ""
      ) {
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
  } else {
    for (const [key, value] of Object.entries(complexValue)) {
      if (key === "attributes") continue;

      if (value !== undefined && value !== null && value !== "") {
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
          parent.att(attrKey, String(attrValue));
        }
      }
    }
  }
}

function processComplexTypeValue(parent: any, complexValue: any): void {
  if (!complexValue || typeof complexValue !== "object") return;

  for (const [key, value] of Object.entries(complexValue)) {
    if (key === "attributes") continue;

    if (value !== undefined && value !== null && value !== "") {
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
        parent.att(attrKey, String(attrValue));
      }
    }
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
