# XSD Constructor

## Для разработчиков и AI ассистентов

**ВАЖНО**: Основная документация для Codex/Cursor находится в [.cody/](./.cody/) директории.

### Быстрый старт:
- Главный компонент: `src/components/XSDForm.vue`
- Рекурсивный компонент: `src/components/XSDGroup.vue`
- Бизнес-логика: `src/composables/useForm.ts`
- Типы: `src/types/schema.ts`

### Ключевые концепции:
1. Рекурсивная обработка XSD через XSDGroup
2. Система путей для идентификации элементов
3. Composition API для управления состоянием