<template>
  <div
    class="mt-2 space-y-3 pl-4"
    :style="level > 0 ? { marginLeft: `${level * 4}px` } : undefined"
  >
    <BaseFieldSelect
      v-model="selectedKey"
      :options="options"
      name="choice"
      :label="choiceLabel"
      option-key="value"
      label-key="label"
      @update:modelValue="onChoiceChange"
    />
    <XSDGroup
      v-if="selectedElement"
      :element="selectedElement"
      :level="level"
      :parent-path="`${path}.${selectedKey}`"
      :current-entity-path="currentEntityPath"
      @update-value="(childPath, val) => emit('update-value', childPath, val)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import XSDGroup from "@/components/XSDGroup.vue";
import BaseFieldSelect from "./BaseFieldSelect.vue";
import { clearElementValues } from "@/utils/xsdUtils";
import type { XSDChoice } from "@/types";

interface Props {
  element: any;
  path: string;
  level: number;
  currentEntityPath?: string;
}

interface Emits {
  (e: "update-value", path: string, value: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const choiceElements = computed(
  () => (props.element.complexType?.choice as XSDChoice)?.elements || {}
);
const choiceLabel = computed(
  () =>
    props.element.complexType?.choice?.annotation?.documentation ||
    "Выберите условие"
);
const options = computed(() =>
  Object.entries(choiceElements.value).map(([key, el]) => ({
    value: key,
    label: el.annotation?.documentation || el.name || key,
  }))
);

const selectedKey = ref(
  props.element.complexType?.choice?.selectedKey || ""
);

const selectedElement = computed(() =>
  selectedKey.value ? choiceElements.value[selectedKey.value] : null
);

watch(
  () => selectedKey.value,
  (newKey, oldKey) => {
    if (newKey === oldKey) return;

    Object.entries(choiceElements.value).forEach(([key, el]) => {
      if (key !== newKey) {
        clearElementValues(el);
      }
    });

    if (props.element.complexType?.choice) {
      props.element.complexType.choice.selectedKey = newKey;
    }
  },
  { immediate: true }
);

const onChoiceChange = (val: string | undefined) => {
  selectedKey.value = val;
};
</script>
