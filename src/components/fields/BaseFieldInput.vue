<template>
  <div class="flex items-center gap-4 mb-3">
    <label :for="fieldId" class="w-1/4 text-sm">
      {{ name }}
    </label>
    <component
      :is="fieldType"
      :id="fieldId"
      :name="fieldId"
      :type="type"
      :value="value"
      :disabled="disabled"
      @input="onInput"
      class="py-2 px-3 border border-gray-300 rounded text-sm transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      :class="{ 'flex-1': type !== 'checkbox' }"
      :placeholder="`Введите значение для ${name}`"
      :pattern="pattern"
    />
  </div>
</template>

<script setup lang="ts">
import { useId } from "vue";

interface Props {
  name: string;
  value?: string | number | boolean;
  type?: string;
  fieldType?: "input" | "textarea";
  disabled?: boolean;
  pattern?: string;
}

interface Emits {
  (e: "input", value: string | number | boolean): void;
}

withDefaults(defineProps<Props>(), {
  type: "text",
  fieldType: "input",
  disabled: false,
});
const emit = defineEmits<Emits>();

const fieldId = useId();

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  let value: string | number | boolean = target.value;

  if (target.type === "number") {
    value = target.valueAsNumber || target.value;
  } else if (target.type === "checkbox") {
    value = target.checked;
  }
  emit("input", value);
}
</script>
