<template>
  <div class="p-2 my-1">
    <!-- <BaseFieldInput
      v-for="(field, key) in schema?.complexTypes?.ReqElement?.attributes"
      :key="key"
      :value="element.value.attributes[key]"
      :label="field.annotation?.documentation || field.name"
      :name="field.name"
      :disabled="true"
      @input="onReqElementAttrChange('ReqElementType', $event)"
    /> -->

    <BaseFieldInput
      v-for="(field, key) in element.complexType.complexContent.extension
        ?.attributes"
      :key="key"
      :value="element.value.attributes[key]"
      :label="field.annotation?.documentation || field.name"
      :name="field.name"
      :disabled="isUidFieldName(field.name)"
      @input="onReqElementAttrChange('ReqElementUid', $event)"
    />

    <XSDGroup
      v-if="reqElementGroup"
      :element="reqElementGroup"
      :level="1"
      :parent-path="basePath || 'ReqElement'"
      @update-value="handleReqElementUpdate"
      @add-dynamic-item="(...args) => emit('add-dynamic-item', ...args)"
      @copy-dynamic-item="(path: string, key: string) => emit('copy-dynamic-item', path, key)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import type { XSDSchema } from "@/types";
import { isUidFieldName, deepCopyElement } from "@/utils/xsdUtils";
import BaseFieldInput from "@/components/fields/BaseFieldInput.vue";
import XSDGroup from "@/components/XSDGroup.vue";

interface Props {
  element: any;
  basePath?: string;
}

interface Emits {
  (e: "update-value", value: any): void;
  (e: "add-dynamic-item", path: string, desiredKey?: string): void;
  (e: "copy-dynamic-item", path: string, key: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const schema: Partial<XSDSchema> = inject("schema", {});

const reqElementGroup = computed(() => {
  const definition = schema?.complexTypes?.ReqElement;
  if (!definition?.sequence) return null;

  const sequence = deepCopyElement(definition.sequence);
  const applyValues = (seq: any, values: any) => {
    if (!seq) return;

    Object.values(seq).forEach((child: any) => {
      const childValue = values ? values[child.name] : undefined;
      if (child.complexType?.sequence) {
        child.value =
          childValue && typeof childValue === "object" ? childValue : {};
        applyValues(child.complexType.sequence, child.value);
      } else {
        child.value =
          childValue !== undefined && childValue !== null ? childValue : "";
      }
    });
  };

  applyValues(sequence, props.element.value);

  return {
    name: "ReqElement",
    annotation: definition.annotation,
    complexType: { sequence },
  };
});

const updateNestedValue = (source: any, path: string, value: any) => {
  const segments = path ? path.split(".") : [];
  if (!segments.length) return value;

  const updatedRoot = { ...(source || {}) };
  let cursor: any = updatedRoot;

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }

    const nextValue = cursor[segment];
    cursor[segment] =
      nextValue && typeof nextValue === "object" ? { ...nextValue } : {};
    cursor = cursor[segment];
  });

  return updatedRoot;
};

const handleReqElementUpdate = (path: string, value: any) => {
  const base = props.basePath || "ReqElement";
  const prefix = `${base}.`;
  const normalizedPath = path.startsWith(prefix)
    ? path.slice(prefix.length)
    : path;

  const updatedValue = updateNestedValue(
    props.element.value || {},
    normalizedPath,
    value
  );

  emit("update-value", updatedValue);
};

const onReqElementAttrChange = (
  key: string,
  value: string | number | boolean
) => {
  const currentValue = props.element.value || {};
  const updatedValue = {
    ...currentValue,
    attributes: {
      ...currentValue.attributes,
      [key]: value,
    },
  };

  emit("update-value", updatedValue);
};

</script>
