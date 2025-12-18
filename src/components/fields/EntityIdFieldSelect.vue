<template>
  <BaseFieldSelect
    :key="fieldId"
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
import { useId, inject, computed, ref } from "vue";
import type { XSDSchema, XSDElement } from "@/types";
import { getNestedValue } from "@/utils/xsdUtils";
import BaseFieldSelect from "./BaseFieldSelect.vue";

interface Props {
  name: string;
  label?: string;
  elementPath: string;
  value?: string;
}

interface Emits {
  (e: "update-value", value: string | undefined): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const schema: Partial<XSDSchema> = inject("schema", {});

const fieldId = useId();

const get = (path: string) => getNestedValue(schema, path);

const selectedEntityUid = ref<string | undefined>(props.value);

const logicalUnitPath = computed(() => {
  const parts = props.elementPath.split(".");
  const luIndex = parts.findIndex((p) => p.startsWith("LogicalUnit_"));
  if (luIndex === -1) return null;
  return parts.slice(0, luIndex + 1).join(".");
});

const entities = computed(() => {
  if (!logicalUnitPath.value) return [];
  
  const items = get(
    `elements.${logicalUnitPath.value}.complexType.sequence.Entities.complexType.sequence`
  ) as Record<string, XSDElement> | undefined;

  if (!items || typeof items !== "object") {
    return [];
  }

  const options: { id: string; name: string }[] = [];

  Object.values(items).forEach((item: any) => {
    const uid = item?.complexType?.sequence?.EntityUid?.value;
    const name = item?.complexType?.sequence?.EntityName?.value;
    if (uid) {
      options.push({
        id: uid,
        name: name || uid,
      });
    }
  });

  return options;
});
</script>
