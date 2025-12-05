<script setup lang="ts">
import { inject, computed } from "vue";
import BaseModal from "./BaseModal.vue";
import type { ComplexTypeInstance } from "@/types";

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: "add", entityData: ComplexTypeInstance): void;
  (e: "update:modelValue", value: boolean): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const mockData: { [key: string]: ComplexTypeInstance[] } = inject(
  "mockData",
  {}
);

const mockEntities = computed(() => {
  return mockData.Entities || [];
});

const selectEntity = (entity: ComplexTypeInstance) => {
  emit("update:modelValue", false);
  emit("add", entity);
};
</script>

<template>
  <BaseModal :show="modelValue" @close="emit('update:modelValue', false)">
    <template #title> Выберите Entity </template>
    <template #content>
      <div class="space-y-2">
        <button
          v-for="entity in mockEntities"
          :key="entity.id"
          @click="selectEntity(entity)"
          class="w-full text-left p-3 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          <div class="font-medium">
            {{ entity.annotation?.documentation || entity.name }}
          </div>
          <div class="text-sm text-gray-600">Тип: {{ entity.type }}</div>
          <div class="text-xs text-gray-500 mt-1">
            Привязан к KSI: {{ entity.data.EntityID?.KSIUIN || "Нет" }}
          </div>
        </button>
      </div>
    </template>
  </BaseModal>
</template>
