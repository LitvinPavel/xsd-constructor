# XSD Constructor

Веб-приложение для визуальной сборки XML документов на основе XSD схем. Загружаете XSD → получаете интерактивную форму → собираете структуру и экспортируете XML.

## Возможности
- Загрузка XSD и парсинг в JSON (fast-xml-parser, utils/xsdParser.ts).
- Рекурсивное отображение complex типов через `XSDGroup.vue` с поддержкой sequence/all/choice/complexContent.
- Управление элементами (Entity, Property, Relation, LogicalUnit) и их путями для идентификации.
- Генерация итогового XML (utils/xmlGenerator.ts).

## Стек
- Vue 3 (Composition API) + TypeScript
- Vite
- Tailwind CSS 4.1.17
- DevExtreme UI (см. `src/plugins/devextreme.ts`)

## Ключевые файлы
- `src/components/XSDForm.vue` — корневая форма, загрузка XSD и рендер корня.
- `src/components/XSDGroup.vue` — рекурсивное дерево элементов.
- `src/composables/useForm.ts` — бизнес-логика формы и состояния.
- `src/types/schema.ts` — типы схемы XSD.

## Разработка
```bash
npm install
npm run dev

# Сборка
npm run build
```

## Доп. документация
Подробности и правила для ассистентов в `.cody/README.md`, `.cody/project-context.md`, `.cody/architecture.md` и `.cody/rules`.
