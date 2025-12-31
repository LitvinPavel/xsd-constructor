<template>
  <BaseFieldSelect
    v-if="isFormulaElementDataField"
    v-model="element.value"
    :key="`${currentPath}-${element.name}-formula-select`"
    :options="formulaSelectOptions"
    :name="element.name"
    :label="element.annotation?.documentation"
    option-key="value"
    label-key="label"
    :disabled="isPRuleFieldDisabled(element, currentPath)"
    @update:modelValue="handleFormulaSelect"
  >
    <div
      v-if="formulaPreview"
      class="mt-3 rounded border border-gray-200 bg-white p-3 text-sm text-gray-800 overflow-auto"
    >
      <div class="text-xs font-medium text-gray-500 mb-2">
        Предпросмотр формулы
      </div>
      <div class="math-preview text-base" v-html="formulaPreview" />
    </div>
  </BaseFieldSelect>

  <BaseFieldSelect
    v-else-if="isGraphElementDataField"
    v-model="element.value"
    :key="`${currentPath}-${element.name}-graph-select`"
    :options="graphSelectOptions"
    :name="element.name"
    :label="element.annotation?.documentation"
    option-key="value"
    label-key="label"
    :disabled="isPRuleFieldDisabled(element, currentPath)"
    @update:modelValue="handleGraphSelect"
  >
    <div
      v-if="graphPreview"
      class="mt-3 rounded border border-gray-200 bg-white p-3 text-sm text-gray-800 overflow-auto"
    >
      <div class="text-xs font-medium text-gray-500 mb-2">
        Предпросмотр схемы
      </div>
      <div class="graph-preview" v-html="graphPreview" />
    </div>
  </BaseFieldSelect>

  <BaseFieldSelect
    v-else-if="isTableElementDataField"
    v-model="element.value"
    :key="`${currentPath}-${element.name}-table-select`"
    :options="tableSelectOptions"
    :name="element.name"
    :label="element.annotation?.documentation"
    option-key="value"
    label-key="label"
    :disabled="isPRuleFieldDisabled(element, currentPath)"
    @update:modelValue="handleTableSelect"
  >
    <div
      v-if="tablePreview"
      class="mt-3 rounded border border-gray-200 bg-white p-3 text-sm text-gray-800 overflow-auto"
    >
      <div class="text-xs font-medium text-gray-500 mb-2">
        Предпросмотр таблицы
      </div>
      <div class="table-preview" v-html="tablePreview" />
    </div>
  </BaseFieldSelect>
</template>

<script setup lang="ts">
import BaseFieldSelect from "@/components/fields/BaseFieldSelect.vue";
import type { XSDElement } from "@/types";

interface Props {
  element: XSDElement;
  currentPath: string;
  isFormulaElementDataField: boolean;
  formulaSelectOptions: any[];
  formulaPreview: string;
  handleFormulaSelect: (value?: string) => void;
  isGraphElementDataField: boolean;
  graphSelectOptions: any[];
  graphPreview: string;
  handleGraphSelect: (value?: string) => void;
  isTableElementDataField: boolean;
  tableSelectOptions: any[];
  tablePreview: string;
  handleTableSelect: (value?: string) => void;
  isPRuleFieldDisabled: (target: any, path: string) => boolean;
}

defineProps<Props>();
</script>
