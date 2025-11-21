<template>
  <div class="ml-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
    <!-- Заголовок группы -->
    <div
      v-if="!group.fields.length"
      class="flex items-center justify-between mb-4 pb-2 border-b border-gray-300 cursor-pointer"
      @click="toggleExpanded"
    >
      <h3 class="flex items-center">
        <span class="text-xs text-gray-400 mr-2">{{ group.name }}</span>
        <span class="text-sm text-gray-600">{{ group.label }}</span>
      </h3>
      <span v-if="hasNestedGroups" class="ml-2 text-gray-400">
        {{ isExpanded ? "▼" : "▶" }}
      </span>
    </div>

    <!-- Поля текущей группы -->
    <div v-if="isExpanded && group.fields.length" class="space-y-4 mb-4">
      <div
        v-for="field in group.fields"
        :key="field.fullName"
        class="space-y-2"
      >
        <label class="block text-sm font-medium text-gray-700">
          <span class="text-xs text-gray-400 mr-2">{{ field.name }}</span>
          <span class="text-xs text-gray-400 mr-2">{{ field.type }}</span>
          <span class="text-sm text-gray-600">{{ field.label }}</span>
          <span v-if="field.required" class="text-red-500 ml-1">*</span>
        </label>
        <FieldInput
          :field="field"
          @update="
            (value) => $emit('update-field', groupPath, field.name, value)
          "
        />
      </div>
    </div>

    <!-- Вложенные группы -->
    <div v-if="isExpanded && group.groups.length > 0" class="space-y-4">
      <FormGroupComponent
        v-for="childGroup in group.groups"
        :key="childGroup.name"
        :group="childGroup"
        :group-path="[...groupPath, group.name]"
        @update-field="
          (childPath, fieldName, value) =>
            $emit(
              'update-field',
              [...groupPath, group.name, ...childPath],
              fieldName,
              value
            )
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { FormGroup } from "../composables/useXSDForm";
import FieldInput from "./FieldInput.vue";

interface Props {
  group: FormGroup;
  groupPath: string[];
}

const props = defineProps<Props>();

const isExpanded = ref(true);

const hasNestedGroups = computed(() => {
  return props.group.groups.length > 0 || props.group.fields.length > 0;
});

const toggleExpanded = () => {
  if (hasNestedGroups.value) {
    isExpanded.value = !isExpanded.value;
  }
};

defineEmits<{
  "update-field": [groupPath: string[], fieldName: string, value: any];
}>();
</script>

<style scoped>
</style>
