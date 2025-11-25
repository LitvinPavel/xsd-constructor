import { ref, type Ref } from 'vue';

export interface ComplexTypeInstance {
  id: string;
  type: string;
  data: any;
  name?: string;
}

export interface ComplexTypesStore {
  instances: Ref<{
        id: string;
        type: string;
        data: any;
        name?: string | undefined;
    }[], ComplexTypeInstance[] | {
        id: string;
        type: string;
        data: any;
        name?: string | undefined;
    }[]>;
    addInstance: (type: string, data: any, name?: string) => ComplexTypeInstance;
    removeInstance: (id: string) => void;
    getInstancesByType: (type: string) => ComplexTypeInstance[];
    getInstanceById: (id: string) => ComplexTypeInstance | undefined;
}

export function useComplexTypes(): ComplexTypesStore {
  const instances = ref<ComplexTypeInstance[]>([]);
  
  // Генерация уникального ID
  const generateId = (): string => {
    return `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Добавление экземпляра
  const addInstance = (type: string, data: any, name?: string): ComplexTypeInstance => {
    const instance: ComplexTypeInstance = {
      id: generateId(),
      type,
      data,
      name: name || `${type}_${instances.value.filter(inst => inst.type === type).length + 1}`
    };
    
    instances.value.push(instance);
    return instance;
  };

  // Удаление экземпляра
  const removeInstance = (id: string): void => {
    const index = instances.value.findIndex(inst => inst.id === id);
    if (index !== -1) {
      instances.value.splice(index, 1);
    }
  };

  // Получение экземпляров по типу
  const getInstancesByType = (type: string): ComplexTypeInstance[] => {
    return instances.value.filter(instance => instance.type === type);
  };

  // Получение экземпляра по ID
  const getInstanceById = (id: string): ComplexTypeInstance | undefined => {
    return instances.value.find(instance => instance.id === id);
  };

  return {
    instances,
    addInstance,
    removeInstance,
    getInstancesByType,
    getInstanceById
  };
}