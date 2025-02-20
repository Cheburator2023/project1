export const PSEUDO_ARTEFACTS = [
  {
    artefact_id: 1000,
    artefact_tech_label: 'model_name',
    artefact_label: 'Название модели в реестре ДАДМ',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '1',
    artefact_type_desc: 'text',
    values: []
  },
  {
    artefact_id: 1001,
    artefact_tech_label: 'model_desc',
    artefact_label: 'Описание модели',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '1',
    artefact_type_desc: 'text',
    values: []
  },
  {
    artefact_id: 2119,
    artefact_tech_label: 'create_date',
    artefact_label: 'Дата создания модели',
    is_edit_flg: '0',
    artefact_desc: '',
    artefact_type_id: '4',
    artefact_type_desc: 'date',
    values: []
  },

  // @TODO: Группа: Аллокация применения (указывается в %, максимально 100 по всем 5 полям)
  {
    artefact_id: 3000,
    artefact_tech_label: 'allocation_kib_usage',
    artefact_label: 'КИБ',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '16',
    artefact_type_desc: 'percentage',
    group: 'Аллокация применения',
    values: []
  },
  {
    artefact_id: 3001,
    artefact_tech_label: 'allocation_smb_usage',
    artefact_label: 'CМБ',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '16',
    artefact_type_desc: 'percentage',
    group: 'Аллокация применения',
    values: []
  },
  {
    artefact_id: 3002,
    artefact_tech_label: 'allocation_rb_usage',
    artefact_label: 'РБ',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '16',
    artefact_type_desc: 'percentage',
    group: 'Аллокация применения',
    values: []
  },
  {
    artefact_id: 3003,
    artefact_tech_label: 'allocation_kc_usage',
    artefact_label: 'КЦ',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '16',
    artefact_type_desc: 'percentage',
    group: 'Аллокация применения',
    values: []
  },
  {
    artefact_id: 3004,
    artefact_tech_label: 'allocation_other_usage',
    artefact_label: 'Другое',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '16',
    artefact_type_desc: 'percentage',
    group: 'Аллокация применения',
    values: []
  },

  // @TODO: Группа: Комментарий к аллокации применения (текстовый комментарий для каждой ГБЛ)
  {
    artefact_id: 3005,
    artefact_tech_label: 'allocation_kib_comment',
    artefact_label: 'КИБ',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '1',
    artefact_type_desc: 'text',
    group: 'Комментарий к аллокации применения',
    values: []
  },
  {
    artefact_id: 3006,
    artefact_tech_label: 'allocation_smb_comment',
    artefact_label: 'CМБ',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '1',
    artefact_type_desc: 'text',
    group: 'Комментарий к аллокации применения',
    values: []
  },
  {
    artefact_id: 3007,
    artefact_tech_label: 'allocation_rb_comment',
    artefact_label: 'РБ',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '1',
    artefact_type_desc: 'text',
    group: 'Комментарий к аллокации применения',
    values: []
  },
  {
    artefact_id: 3008,
    artefact_tech_label: 'allocation_kc_comment',
    artefact_label: 'КЦ',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '1',
    artefact_type_desc: 'text',
    group: 'Комментарий к аллокации применения',
    values: []
  },
  {
    artefact_id: 3009,
    artefact_tech_label: 'allocation_other_comment',
    artefact_label: 'Другое',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '1',
    artefact_type_desc: 'text',
    group: 'Комментарий к аллокации применения',
    values: []
  },

  //  @TODO: Группа: Дата подтверждения использования (Указывается дата подтверждения по кварталам в формате дд/мм/гггг)
  {
    artefact_id: 3010,
    artefact_tech_label: 'usage_confirm_date_q1',
    artefact_label: '1Q',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '17',
    artefact_type_desc: 'quarterly_date',
    group: 'Дата подтверждения использования',
    start_date_depend_artefact: 'create_date',
    values: []
  },
  {
    artefact_id: 3011,
    artefact_tech_label: 'usage_confirm_date_q2',
    artefact_label: '2Q',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '17',
    artefact_type_desc: 'quarterly_date',
    group: 'Дата подтверждения использования',
    start_date_depend_artefact: 'create_date',
    values: []
  },
  {
    artefact_id: 3012,
    artefact_tech_label: 'usage_confirm_date_q3',
    artefact_label: '3Q',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '17',
    artefact_type_desc: 'quarterly_date',
    group: 'Дата подтверждения использования',
    start_date_depend_artefact: 'create_date',
    values: []
  },
  {
    artefact_id: 3013,
    artefact_tech_label: 'usage_confirm_date_q4',
    artefact_label: '4Q',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '18',
    artefact_type_desc: 'quarterly_date',
    group: 'Дата подтверждения использования',
    start_date_depend_artefact: 'create_date',
    values: []
  },

  // @TODO: Модель используется заказчиком (Dropdown с вариантами Да/Нет)
  {
    artefact_id: 3014,
    artefact_tech_label: 'usage_confirm_flag_q1',
    artefact_label: '1Q',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '19',
    artefact_type_desc: 'quarterly_dropdown',
    group: 'Модель используется заказчиком',
    values: [
      {
        artefact_id: 3014,
        is_active_flag: '1',
        artefact_parent_value_id: null,
        artefact_value_id: 100,
        artefact_value: 'Да'
      },
      {
        artefact_id: 3014,
        is_active_flag: '1',
        artefact_parent_value_id: null,
        artefact_value_id: 101,
        artefact_value: 'Нет'
      }
    ]
  },
  {
    artefact_id: 3015,
    artefact_tech_label: 'usage_confirm_flag_q2',
    artefact_label: '2Q',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '19',
    artefact_type_desc: 'quarterly_dropdown',
    group: 'Модель используется заказчиком',
    values: [
      {
        artefact_id: 3015,
        is_active_flag: '1',
        artefact_parent_value_id: null,
        artefact_value_id: 102,
        artefact_value: 'Да'
      },
      {
        artefact_id: 3015,
        is_active_flag: '1',
        artefact_parent_value_id: null,
        artefact_value_id: 103,
        artefact_value: 'Нет'
      }
    ]
  },
  {
    artefact_id: 3016,
    artefact_tech_label: 'usage_confirm_flag_q3',
    artefact_label: '3Q',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '19',
    artefact_type_desc: 'quarterly_dropdown',
    group: 'Модель используется заказчиком',
    values: [
      {
        artefact_id: 3016,
        is_active_flag: '1',
        artefact_parent_value_id: null,
        artefact_value_id: 104,
        artefact_value: 'Да'
      },
      {
        artefact_id: 3016,
        is_active_flag: '1',
        artefact_parent_value_id: null,
        artefact_value_id: 105,
        artefact_value: 'Нет'
      }
    ]
  },
  {
    artefact_id: 3017,
    artefact_tech_label: 'usage_confirm_flag_q4',
    artefact_label: '4Q',
    is_edit_flg: '1',
    artefact_desc: '',
    artefact_type_id: '19',
    artefact_type_desc: 'quarterly_dropdown',
    group: 'Модель используется заказчиком',
    values: [
      {
        artefact_id: 3017,
        is_active_flag: '1',
        artefact_parent_value_id: null,
        artefact_value_id: 106,
        artefact_value: 'Да'
      },
      {
        artefact_id: 3017,
        is_active_flag: '1',
        artefact_parent_value_id: null,
        artefact_value_id: 107,
        artefact_value: 'Нет'
      }
    ]
  }
]
