import type { ComplexTypeInstance } from "@/types";

export const ksiData1 = {
  KSITableCode: 'RZo',
  KSICodeOfClass: '12345',
  KSINameOfClass: 'Класс оборудования 1',
  KSICodeOfType: '001',
  KSITypeOfClass: 'Тип класса 1',
  KSIUIN: 'UIN123456789',
  KSIVersion: '2025-01-01'
};

export const ksiData2 = {
  KSITableCode: 'CCo',
  KSICodeOfClass: '67890',
  KSINameOfClass: 'Класс материалов',
  KSICodeOfType: '002',
  KSITypeOfClass: 'Тип класса 2',
  KSIUIN: 'UIN987654321',
  KSIVersion: '2024-12-15'
};


export const mockData: { [key: string]: ComplexTypeInstance[] } = {
  KSIIdentification: [
    {
      id: 'ksi_1',
      name: 'Идентификация КСИ 1',
      type: 'KSIIdentification',
      annotation: {
        documentation: 'Идентификация оборудования по классификатору'
      },
      data: ksiData1
    },
    {
      id: 'ksi_2',
      name: 'Идентификация КСИ 2',
      type: 'KSIIdentification',
      annotation: {
        documentation: 'Идентификация материалов по классификатору'
      },
      data: ksiData2
    }
  ],

  Organization: [
    {
      id: 'org_1',
      name: 'Организация А',
      type: 'Organization',
      annotation: {
        documentation: 'Организация разработчик А'
      },
      data: {
        ShortName: 'ОргА',
        FullName: 'Полное наименование Организации А'
      }
    },
    {
      id: 'org_2',
      name: 'Организация Б',
      type: 'Organization',
      annotation: {
        documentation: 'Организация разработчик Б'
      },
      data: {
        ShortName: 'ОргБ',
        FullName: 'Полное наименование Организации Б с дополнительной информацией'
      }
    }
  ],

  Link: [
    {
      id: 'link_1',
      name: 'Внешняя ссылка',
      type: 'Link',
      annotation: {
        documentation: 'Внешняя ссылка на ГОСТ'
      },
      data: {
        attributes: {
          IdLink: 'Link123',
          LinkType: 'внешняя'
        },
        NameOfSourceDocument: 'ГОСТ Р 12345-2024',
        LinkReqUid: 'REQ_001',
        LinkReqElementUid: 'ELEM_001'
      }
    },
    {
      id: 'link_2',
      name: 'Внутренняя ссылка',
      type: 'Link',
      annotation: {
        documentation: 'Внутренняя ссылка на стандарт'
      },
      data: {
        attributes: {
          IdLink: 'Link456',
          LinkType: 'внутренняя'
        },
        NameOfSourceDocument: 'Внутренний стандарт',
        LinkReqUid: 'REQ_002',
        LinkReqElementUid: 'ELEM_002'
      }
    }
  ],

  Condition: [
    {
      id: 'cond_1',
      name: 'Условие равенства',
      type: 'Condition',
      annotation: {
        documentation: 'Условие равенства значений'
      },
      data: {
        ConditionUid: 'Condition123',
        EqualityCondition: {
          attributes: {
            TypeOfCondition: 'равно'
          },
          Value: 10.5,
          UnitsOfMeasurement: 'мм'
        },
        ConditionRole: 'посылка'
      }
    },
    {
      id: 'cond_2',
      name: 'Условие сравнения',
      type: 'Condition',
      annotation: {
        documentation: 'Условие сравнения значений'
      },
      data: {
        ConditionUid: 'Condition456',
        ComparisonCondition: {
          attributes: {
            TypeOfCondition: 'больше'
          },
          Value: 5.2,
          UnitsOfMeasurement: 'м'
        },
        ConditionRole: 'следствие'
      }
    }
  ],
};
