<template>
  <div class="p-2 mb-1">
    <BaseFieldInput
      v-for="(field, key) in schema?.complexTypes?.ReqElement?.attributes"
      :key="key"
      :value="element.value.attributes[key]"
      :label="field.annotation?.documentation || field.name"
      :name="field.name"
      :disabled="true"
      @input="onReqElementAttrChange('ReqElementType', $event)"
    />

    <BaseFieldInput
      v-for="(field, key) in element.complexType.complexContent.extension
        ?.attributes"
      :key="key"
      :value="element.value.attributes[key]"
      :label="field.annotation?.documentation || field.name"
      :name="field.name"
      @input="onReqElementAttrChange('ReqElementUid', $event)"
    />

    <BaseFieldInput
      v-for="field in schema?.complexTypes?.ReqElement?.sequence"
      :key="field.name"
      :value="getReqElementFieldValue(field.name)"
      :type="getInputType(field.type)"
      :label="field.annotation?.documentation || field.name"
      :name="field.name"
      :field-type="field.name === 'ReqElementData' ? 'textarea' : 'input'"
      @input="onReqElementFieldChange(field.name, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue";
import type { XSDSchema } from "@/types";
import { getInputType, decodeHTMLEntities } from "@/utils/xsdUtils";
import BaseFieldInput from "@/components/fields/BaseFieldInput.vue";

interface Props {
  element: any;
}

interface Emits {
  (e: "update-value", value: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const schema: Partial<XSDSchema> = inject("schema", {});

const getReqElementFieldValue = (fieldName: string): any => {
  if (!props.element.value || typeof props.element.value !== "object")
    return "";
  return props.element.value[fieldName] || "";
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

const onReqElementFieldChange = (
  fieldName: string,
  value: string | number | boolean
) => {
  const currentValue = props.element.value || {};
  const updatedValue = {
    ...currentValue,
    [fieldName]: typeof value === "string" ? decodeHTMLEntities(value) : value,
  };

  emit("update-value", updatedValue);
};
</script>
