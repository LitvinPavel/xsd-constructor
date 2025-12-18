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
        :value="isManualInput"
        text="Ручное заполнение"
        class="text-sm"
        @value-changed="onToggleInputMode"
      />
    </BaseFieldInput>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, useId, watch } from "vue";
import type { ValueChangedEvent } from "devextreme/ui/check_box";
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
const logicalUnitId = computed(
  () => props.path.match(/LogicalUnit_\d+/)?.[0] || ""
);

const syncManualFlagFromSchema = () => {
  if (!logicalUnitId.value) return;
  isManualInput.value = !!schema.pRuleManualInputs?.[logicalUnitId.value];
};

const onChange = (e: string | number | boolean): void => {
  emit("update-value", e);
};

const onToggleInputMode = (e: ValueChangedEvent) => {
  isManualInput.value = e.value;
  if (logicalUnitId.value) {
    schema.pRuleManualInputs = {
      ...(schema.pRuleManualInputs || {}),
      [logicalUnitId.value]: isManualInput.value,
    };
  }

  if (!isManualInput.value) {
    calculateValue();
  } else {
    emit("update-value", props.element.value);
  }
};

const calculateValue = (): void => {
  const logicalUnitId = props.path.match(/LogicalUnit_\d+/)?.[0];
  const pRuleLogicalUnitMap =
    schema.pRuleLogicalUnits?.[logicalUnitId as string];

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
    updatedValue = `${beforeThen.map((key) => `(${key})`).join(" AND ")}`;
  } else if (beforeThen.length && afterThen.length) {
    updatedValue = `IF ${beforeThen
      .map((key) => `(${key})`)
      .join(" AND ")} THEN ${afterThen.map((key) => `(${key})`).join(" AND ")}`;
  }
  emit("update-value", updatedValue);
};

watch(
  () => schema.pRuleLogicalUnits,
  () => calculateValue(),
  { deep: true }
);

watch(logicalUnitId, syncManualFlagFromSchema, { immediate: true });
watch(
  () => schema.pRuleManualInputs,
  () => syncManualFlagFromSchema()
);
</script>
