<template>
  <div class="flex items-center gap-4 mb-3">
    <label :for="fieldId" class="text-sm w-1/3 text-gray-600">
      {{ label }}
    </label>
    <div class="flex-1">
      <div class="flex gap-2 items-start flex-1">
        <DxSelectBox
        :id="fieldId"
        :value="modelValue"
        :items="options"
        :display-expr="getDisplayExpr"
        :value-expr="optionKey"
        :disabled="disabled"
        :show-clear-button="true"
        :required="isСannotEnpty"
        :placeholder="`Выберите значение для поля ${name}`"
        @value-changed="onValueChanged"
        class="flex-1"
        no-data-text="Нет данных для выбора"
      />
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId, computed } from "vue";
import { DxSelectBox } from "devextreme-vue";

interface IOption {
  [key: string]: any;
}

interface Props {
  name: string;
  label?: string;
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

const getDisplayExpr = computed(() => {
  return (item: IOption) => {
    const keys = String(props.labelKey).split(".");
    let value = item;
    for (const key of keys) {
      if (value && value[key] !== undefined) {
        value = value[key];
      } else {
        return "";
      }
    }
    return String(value);
  };
});

function onValueChanged(event: { value: string }) {
  emit("update:modelValue", event.value);
}

</script>