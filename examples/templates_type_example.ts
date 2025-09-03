type SetFilter = {
  values: (string | null)[]
  filterType: string
}

type DateFilter = {
  dateFrom: string
  dateTo: string
  filterType: string
  type: string
}

type FilterModel = {
  [key: string]: SetFilter | DateFilter
}

export type Template = {
  template_id: number
  user_id: string | null
  group_id?: number
  template_name: string
  group_label?: string
  filterModel?: FilterModel
  sortState?: Array<{
    colId: string
    sort: 'asc' | 'desc'
    sortIndex: number
  }>
  columnState?: Array<{
    colId: string
    hide?: boolean
  }>
  selectedIds?: string[]
  isOwner?: boolean
  public?: boolean
  isPending?: boolean
}

export type TemplateAddApi = {
  template_name: string
  public: boolean
  filterModel?: any
  sortState?: Array<{
    colId: string
    sort: 'asc' | 'desc'
    sortIndex: number
  }>
  selectedIds?: string[]
}
