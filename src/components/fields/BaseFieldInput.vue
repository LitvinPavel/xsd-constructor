<template>
  <div class="flex items-center gap-4 mb-3">
    <label :for="fieldId" class="w-1/3 text-sm text-gray-600">
      {{ label }}
    </label>
    
    <DxNumberBox
      v-if="type === 'number'"
      :id="fieldId"
      :value="value || null"
      :disabled="disabled || isUidField"
      :placeholder="`Введите значение для поля ${name}`"
      @value-changed="onInput"
      class="flex-1"
    />
    <DxDateBox
      v-else-if="
        type === 'date' || type === 'datetime-local' || type === 'time'
      "
      :id="fieldId"
      :value="value"
      :disabled="disabled"
      :placeholder="`Введите значение для поля ${name}`"
      :type="type"
      :display-format="type === 'date' ? 'dd.MM.yyyy': 'DD.MM.yyyy HH:mm'"
      @value-changed="onInput"
      class="flex-1"
    />
    <DxCheckBox
      v-else-if="type === 'checkbox'"
      :id="fieldId"
      :value="value"
      :disabled="disabled"
      :text="`Введите значение для поля ${name}`"
      @value-changed="onInput"
      class="flex-1"
    />
    <DxTextArea
      v-else
      :id="fieldId"
      :value="value"
      :disabled="disabled || isUidField"
      :placeholder="`Введите значение для поля ${name}`"
      @value-changed="onInput"
      :auto-resize-enabled="true"
      class="flex-1"
    />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";
import DxNumberBox, { type DxNumberBoxTypes } from "devextreme-vue/number-box";
import DxDateBox, { type DxDateBoxTypes } from "devextreme-vue/date-box";
import DxTextArea, { type DxTextAreaTypes } from "devextreme-vue/text-area";
import DxCheckBox, { type DxCheckBoxTypes } from "devextreme-vue/check-box";
import { isUidFieldName } from "@/utils/xsdUtils";

interface Props {
  label?: string;
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

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  fieldType: "input",
  disabled: false,
});
const emit = defineEmits<Emits>();

const fieldId = useId();
const isUidField = computed(() => isUidFieldName(props.name));

function onInput(
  event:
    | DxNumberBoxTypes.ValueChangedEvent
    | DxDateBoxTypes.ValueChangedEvent
    | DxTextAreaTypes.ValueChangedEvent
    | DxCheckBoxTypes.ValueChangedEvent
) {
  emit("input", event.value);
}
</script>

<style scoped>
.dx-numberbox,
.dx-datebox,
.dx-selectbox {
  width: 100%;
}
</style>
