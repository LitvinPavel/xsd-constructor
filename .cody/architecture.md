# 🏗️ Архитектура проекта

## Структура данных

src/
├── components/ # Vue компоненты
│ ├── XSDForm.vue # Главная форма
│ ├── XSDGroup.vue # Рекурсивный компонент (ВАЖНО!)
│ ├── fields/ # Поля ввода
│ ├── modals/ # Модальные окна
│ └── ComplexTypeInstanceView.vue
├── composables/ # Composition API
│ └── useForm.ts # Логика формы
├── plugins/ # Подключение UI библиотек
│ └── devextreme.ts # Регистрация DevExtreme компонентов/тем
├── types/ # TypeScript типы
│ └── schema.ts # Интерфейсы XSD
├── utils/ # Утилиты
│ ├── xsdParser.ts # Парсер XSD → JSON
│ ├── xsdUtils.ts # Вспомогательные функции
│ └── xmlGenerator.ts # Генератор XML
└── mockData.ts # Данные для complex типов
