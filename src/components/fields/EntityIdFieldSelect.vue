<template>
  <BaseFieldSelect
    v-model="selectedEntityUid"
    :name="name"
    :label="label"
    :options="entities"
    option-key="id"
    label-key="id"
    @update:modelValue="emit('update-value', selectedEntityUid)"
  />
</template>

<script setup lang="ts">
import { inject, computed, ref } from "vue";
import type { XSDSchema, XSDElement } from "@/types";
import { getNestedValue } from "@/utils/xsdUtils";
import BaseFieldSelect from "./BaseFieldSelect.vue";

interface Props {
  name: string;
  label?: string;
}

interface Emits {
  (e: "update-value", value: string | undefined): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
const schema: Partial<XSDSchema> = inject("schema", {});

const get = (path: string) => getNestedValue(schema, path);

const selectedEntityUid = ref<string | undefined>(undefined);

const entities = computed(() => {
  const items: XSDElement = get(
    "elements.Requirement.complexType.sequence.DMODEL.complexType.sequence.Entities.complexType.sequence"
  );
  return Object.values(items).map((item) => {
    return {
      id: item.complexType.sequence.EntityUid.value,
      name: item.complexType.sequence.EntityName.value,
    };
  });
});
</script>
