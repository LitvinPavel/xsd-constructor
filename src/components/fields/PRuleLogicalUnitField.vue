<template>
  <div class="p-2 mb-1">
    <BaseFieldInput
      :value="element.value"
      :label="element.annotation?.documentation || element.name"
      :name="element.name"
      :disabled="!isManualInput"
      field-type="textarea"
      @input="onChange"
    >
      <DxCheckBox
        :id="fieldId"
        v-model="isManualInput"
        text="Ручное заполнение"
        class="text-sm"
      />
    </BaseFieldInput>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, useId, watch } from "vue";
import type { XSDSchema, XSDElement } from "@/types";
import BaseFieldInput from "@/components/fields/BaseFieldInput.vue";

interface Props {
  element: XSDElement;
  path: string;
}

interface Emits {
  (e: "update-value", value: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const schema: Partial<XSDSchema> = inject("schema", {});

const fieldId = useId();
const isManualInput = ref<boolean>(false);

const onChange = (e: string | number | boolean): void => {
  console.log(e);
};

watch(
  () => schema.pRuleLogicalUnits,
  (newValue) => {
    const logicalUnitId = props.path.match(/LogicalUnit_\d+/)?.[0];
    const pRuleLogicalUnitMap = newValue?.[logicalUnitId as string];

    const beforeThen: string[] = [];
    const afterThen: string[] = [];
    let updatedValue = null;
    if (pRuleLogicalUnitMap) {
      Object.keys(pRuleLogicalUnitMap).forEach((key: string) => {
        if (pRuleLogicalUnitMap[key] === "посылка") {
          beforeThen.push(key);
        } else if (pRuleLogicalUnitMap[key] === "следствие") {
          afterThen.push(key);
        }
      });
    }
    if (beforeThen.length && !afterThen.length) {
      updatedValue = `${beforeThen
        .map((key) => `(${key})`)
        .join(" AND ")}`;
    }else if (beforeThen.length && afterThen.length) {
      updatedValue = `IF ${beforeThen
        .map((key) => `(${key})`)
        .join(" AND ")} THEN ${afterThen
        .map((key) => `(${key})`)
        .join(" AND ")}`;
      
    }
    if (updatedValue) {
      emit("update-value", updatedValue);
    }
  }
);
</script>
