<template>
  <div class="flex items-center gap-4 mb-3">
    <label :for="fieldId" class="w-1/4 text-sm">
      {{ name }}
    </label>
    <div class="flex-1">
      <div class="flex gap-2 items-start flex-1">
        <select
          :value="modelValue"
          :id="fieldId"
          :name="fieldId"
          :disabled="disabled"
          class="flex-1 py-2 px-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          @change="
            $emit(
              'update:modelValue',
              ($event.target as HTMLSelectElement).value
            )
          "
        >
          <option value="">-- Выберите из списка --</option>
          <option
            v-for="(option, id) in options"
            :key="id"
            :value="option[optionKey]"
          >
            {{ getOptionLabel(option) }}
          </option>
        </select>
        <button
          v-if="modelValue && !isСannotEnpty"
          @click="$emit('update:modelValue', undefined)"
          class="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 whitespace-nowrap"
          type="button"
        >
          Очистить
        </button>
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from "vue";

interface IOption {
  [key: string]: any;
}

interface Props {
  name: string;
  modelValue?: string;
  options: IOption[];
  optionKey: keyof IOption;
  labelKey: keyof IOption;
  disabled?: boolean;
  isСannotEnpty?: boolean;
}

interface Emits {
  (e: "update:modelValue", value: string | undefined): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  isСannotEnpty: false,
});
const emit = defineEmits<Emits>();

const fieldId = useId();

const getOptionLabel = (option: IOption): any => {
  const label = String(props.labelKey)
    .split(".")
    .reduce((acc, key) => {
      return acc && acc[key] !== undefined ? acc[key] : "";
    }, option);
  return label;
};
</script>
