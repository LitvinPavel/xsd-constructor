<template>
  <div class="complex-type-selector">
    <select 
      v-model="selectedInstanceId"
      class="w-full p-2 border border-gray-300 rounded"
      @change="onInstanceSelected"
    >
      <option value="">-- Выберите существующий экземпляр --</option>
      <option 
        v-for="instance in availableInstances" 
        :key="instance.id"
        :value="instance.id"
      >
        {{ instance.name || `${instance.type} #${instance.id.slice(-4)}` }}
      </option>
      <option value="new">+ Создать новый</option>
    </select>

    <!-- Форма для создания нового экземпляра -->
    <div v-if="showCreateForm" class="mt-4 p-4 border rounded bg-gray-50">
      <button
        type="button"
        @click="showCreateForm = false"
        class="mb-2 text-sm text-blue-600 hover:text-blue-800"
      >
        ← Назад к выбору
      </button>
      <ComplexTypeForm
        :schema="schema"
        :target-type="typeName"
        @instance-created="onNewInstanceCreated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import ComplexTypeForm from './ComplexTypeForm.vue';
import type { ComplexTypeInstance, ComplexTypesStore } from '../composables/useComplexTypes';

interface Props {
  typeName: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'type-selected', instance: ComplexTypeInstance): void;
}>();

const schema = inject('schema', {});
const complexTypesStore: ComplexTypesStore | undefined = inject('complexTypesStore');

const selectedInstanceId = ref('');
const showCreateForm = ref(false);

const availableInstances = computed(() => {
  if (!complexTypesStore) {
    console.warn('complexTypesStore not available');
    return [];
  }
  
  return complexTypesStore.getInstancesByType(props.typeName);
});

const onInstanceSelected = () => {
  if (selectedInstanceId.value === 'new') {
    showCreateForm.value = true;
  } else if (selectedInstanceId.value) {
    const instance = complexTypesStore?.getInstanceById(selectedInstanceId.value);
    if (instance) {
      console.log('Emitting complex type instance:', instance);
      // Убедимся, что передаем data, а не весь instance
      emit('type-selected', {
        ...instance,
        data: instance.data // Явно передаем data
      });
    }
  }
};

const onNewInstanceCreated = (instance: ComplexTypeInstance) => {
  emit('type-selected', instance);
  showCreateForm.value = false;
  selectedInstanceId.value = '';
};
</script>