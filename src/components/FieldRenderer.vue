<template>
  <div
    class="field-renderer"
    :class="{ required: field.required, disabled: !field.editable }"
  >
    <label :for="field.name" class="field-label">
      {{ field.label }}
      <span v-if="field.required" class="required-asterisk">*</span>
      <span v-if="!field.editable" class="non-editable-badge"
        >Требует разработки</span
      >
    </label>

    <div v-if="field.documentation" class="field-docs">
      {{ field.documentation }}
    </div>

    <!-- Текстовое поле -->
    <input
      v-if="field.type === 'string' && !field.options && field.editable"
      :id="field.name"
      type="text"
      :value="value"
      @input="handleInput($event)"
      class="field-input"
    />

    <!-- Числовое поле -->
    <input
      v-else-if="field.type === 'number' && field.editable"
      :id="field.name"
      type="number"
      :value="value"
      @input="handleInput($event)"
      class="field-input"
    />

    <!-- Выпадающий список -->
    <select
      v-else-if="
        field.type === 'choice' &&
        field.options &&
        field.options.length > 0 &&
        field.editable
      "
      :id="field.name"
      :value="value"
      @change="handleInput($event)"
      class="field-select"
    >
      <option v-for="option in field.options" :key="option" :value="option">
        {{ option }}
      </option>
    </select>

    <!-- Checkbox -->
    <div
      v-else-if="field.type === 'boolean' && field.editable"
      class="checkbox-wrapper"
    >
      <input
        :id="field.name"
        type="checkbox"
        :checked="value === true"
        @change="handleCheckbox($event)"
        class="field-checkbox"
      />
      <label :for="field.name" class="checkbox-label">{{ field.label }}</label>
    </div>

    <!-- Дата -->
    <input
      v-else-if="field.type === 'date' && field.editable"
      :id="field.name"
      type="date"
      :value="value"
      @input="handleInput($event)"
      class="field-input"
    />

    <!-- Нередактируемые поля -->
    <div v-else class="non-editable-field">
      <div class="non-editable-content">
        <span class="field-type-badge">{{
          getTypeDisplayName(field.type)
        }}</span>
        <span class="field-value">{{ value }}</span>
      </div>
      <div class="non-editable-message">
        Тип
        <pre>{{ field.type }}</pre>
        пока не поддерживается
      </div>
    </div>

    <div class="field-meta">
      <span class="field-type">{{ getTypeDisplayName(field.type) }}</span>
      <span class="field-category">{{ field.category }}</span>
      <span class="field-layer">{{ field.layer }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormField } from '../types';

interface Props {
  field: FormField;
  value: string | number | boolean | null;
}

interface Emits {
  (e: 'update:value', value: string | number | boolean | null): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const getTypeDisplayName = (type: string): string => {
  const typeNames: { [key: string]: string } = {
    string: 'Text',
    number: 'Number',
    boolean: 'Boolean',
    date: 'Date',
    choice: 'Choice',
    object: 'Object',
    array: 'Array',
    graph: 'Graph',
    table: 'Table',
    formula: 'Formula',
  };

  return typeNames[type] || type;
};

const handleInput = (event: Event): void => {
  if (!props.field.editable) return;

  const target = event.target as HTMLInputElement | HTMLSelectElement;
  let value: string | number | boolean | null = target.value;

  // Преобразование для числовых полей
  if (props.field.type === 'number' && typeof value === 'string') {
    value = value === '' ? null : Number(value);
  }

  emit('update:value', value);
};

const handleCheckbox = (event: Event): void => {
  if (!props.field.editable) return;

  const target = event.target as HTMLInputElement;
  emit('update:value', target.checked);
};
</script>
