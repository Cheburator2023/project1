import { Injectable } from '@nestjs/common'
import { SumDatabaseService } from 'src/system/sum-database/database.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'

import { sql as getSumModels } from './sql/sum/getModels'
import { sql as getArtefacts } from './sql/sum/getArtefacts'
import { sql as getSumRmModels } from './sql/sum-rm/getModels'
import { sql as getSumRmModel } from './sql/sum-rm/getModel'
import { sql as getModelsByTypeAndParentId } from './sql/sum-rm/getModelsByTypeAndParentId'

import { isValidDate, parseDate, formatDateTime } from 'src/system/common/utils'

interface Model {
    [key: string]: any;
}

interface GroupedResults {
    [key: string]: Model[];
}

interface ModelsDto {
    date: string | null;
}

interface CompareModelsDto {
    firstDate: string;
    secondDate: string;
}

interface ModelWithRelationsDto {
    model_id: string;
}

interface ModelType {
    id: number;
    name: string;
}

interface ModelRelationsResponse {
    data: {
        card: Model & {
            modules: Model[];
            calibrations: Model[];
            [key: string]: Model[];
        };
    }
}

interface Artefact {
    artefact_id: number;
    artefact_tech_label: string;
    artefact_label: string;
    is_edit_flg: string;
    artefact_desc: string;
    artefact_type_id: string;
    artefact_type_desc: string;
    values: ArtefactValue[];
    group?: string;
    start_date_depend_artefact?: string;
}

interface ArtefactValue {
    artefact_id: number;
    is_active_flag: string;
    artefact_parent_value_id: number | null;
    artefact_value_id: number;
    artefact_value: string;
}

interface PreparedArtefactsResult {
    data: Artefact[];
}

@Injectable()
export class ModelsService {
    constructor(
        private readonly sumDatabaseService: SumDatabaseService,
        private readonly mrmDatabaseService: MrmDatabaseService
    ) {
    }

    async getModels({ date }: ModelsDto): Promise<{ data: { cards: Model[] } }> {
        const results = await this.fetchAndMergeModels(date)

        const formattedResults = await this.formatResults(results)

        return {
            data: {
                cards: formattedResults
            }
        }
    }

    async getModelsByDates({ firstDate, secondDate }: CompareModelsDto): Promise<{ data: { cards: GroupedResults } }> {
        const firstDateResults = await this.fetchAndMergeModels(firstDate)
        const secondDateResults = await this.fetchAndMergeModels(secondDate)

        const formattedFirstDateResults = await this.formatResults(firstDateResults)
        const formattedSecondDateResults = await this.formatResults(secondDateResults)

        const groupedResults = this.groupResultsByModelIdAndSource(
            formattedFirstDateResults,
            formattedSecondDateResults
        )

        return {
            data: {
                cards: groupedResults
            }
        }
    }

    async getModelWithRelations({ model_id }: ModelWithRelationsDto): Promise<ModelRelationsResponse> {
        const mrmModel = await this.mrmDatabaseService.query(getSumRmModel, { model_id })

        const modelTypes: ModelType[] = await this.mrmDatabaseService.query('SELECT * FROM model_types', {})

        const modelTypeDict = this.createModelTypeDictionary(modelTypes)

        const modules = await this.mrmDatabaseService.query(getModelsByTypeAndParentId, {
            type_id: modelTypeDict.module,
            parent_model_id: model_id
        })

        const calibrations = await this.mrmDatabaseService.query(getModelsByTypeAndParentId, {
            type_id: modelTypeDict.calibration,
            parent_model_id: model_id
        })

        return {
            data: {
                card: {
                    ...mrmModel.pop(),
                    modules: [...modules],
                    calibrations: [...calibrations]
                }
            }
        }
    }

    private createModelTypeDictionary(modelTypes: ModelType[]): Record<string, number> {
        const dictionary: Record<string, number> = {}

        modelTypes.forEach(type => {
            dictionary[type.name] = type.id
        })

        return dictionary
    }

    private async fetchAndMergeModels(date: string | null): Promise<Model[]> {
        const filterDate = date || null

        const sumModels = await this.sumDatabaseService.query(getSumModels, {
            filter_date: filterDate
        })
        const mrmModels = await this.mrmDatabaseService.query(getSumRmModels, {
            filter_date: filterDate
        })

        this.mergeAttributes(sumModels, mrmModels, 'system_model_id')

        return this.mergeModels(sumModels, mrmModels, 'system_model_id')
    }

    private mergeAttributes(sumModels: Model[], mrmModels: Model[], prop: string): void {
        mrmModels.forEach(mrmModel => {
            const sumModel = sumModels.find(sumModel => mrmModel[prop] === sumModel[prop])
            if (sumModel) {
                Object.keys(mrmModel).forEach(key => {
                    if (mrmModel[key] == null) {
                        mrmModel[key] = sumModel[key] || null
                    }
                })
            }
        })
    }

    private mergeModels(a: Model[], b: Model[], prop: string): Model[] {
        const uniqueA = a.filter(aitem => !b.some(bitem => aitem[prop] === bitem[prop]))
        return uniqueA.concat(b)
    }

    private async formatResults(models: Model[]): Promise<Model[]> {
        const artefacts = await this.getArtefactLabels()

        return models.map((item: Model): Model => {
            Object.keys(item).forEach(key => {
                if (artefacts.includes(key) && item[key] !== null) {
                    item[key] = this.formatDateField(item[key])
                }
            })
            return item
        })
    }

    private async getArtefactLabels(): Promise<string[]> {
        const artefacts = await this.getPreparedArtefacts()
        return artefacts.data
            .filter(item => ['4', '17'].includes(item.artefact_type_id))
            .map(artefact => artefact.artefact_tech_label)
    }

    private formatDateField(dateString: string): string {
        return isValidDate(dateString) ? formatDateTime(parseDate(dateString)) : 'invalid date'
    }

    private groupResultsByModelIdAndSource(
        firstDateResults: Model[],
        secondDateResults: Model[]
    ): GroupedResults {
        const groupedResults: GroupedResults = {}

        const allResults = [...firstDateResults, ...secondDateResults]
        const allKeys = new Set(allResults.map(result => `${ result.system_model_id }:${ result.model_source }`))

        allKeys.forEach(key => {
            const firstDateModel = firstDateResults.find(result => `${ result.system_model_id }:${ result.model_source }` === key) || null
            const secondDateModel = secondDateResults.find(result => `${ result.system_model_id }:${ result.model_source }` === key) || null

            groupedResults[key] = []

            if (firstDateModel) {
                groupedResults[key].push(firstDateModel)
            } else {
                groupedResults[key].push({})
            }

            if (secondDateModel) {
                groupedResults[key].push(secondDateModel)
            } else {
                groupedResults[key].push({})
            }
        })

        return groupedResults
    }

    private async getPreparedArtefacts(): Promise<PreparedArtefactsResult> {
        const result = await this.mrmDatabaseService.query(getArtefacts, [])
        const defaultArtefacts: Artefact[] = [
            {
                artefact_id: 1000,
                artefact_tech_label: 'model_name',
                artefact_label: 'Название модели',
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

        const processedArtefacts = this.processArtefactData(result)

        return {
            data: [...defaultArtefacts, ...processedArtefacts]
        }
    }

    private processArtefactData(data: any[]): Artefact[] {
        return data.reduce((prev: Artefact[], curr: any) => {
            const lastArtefact = prev[prev.length - 1]

            if (!lastArtefact || lastArtefact.artefact_id !== curr.artefact_id) {
                const newArtefact: Artefact = {
                    artefact_id: curr.artefact_id,
                    artefact_tech_label: curr.artefact_tech_label,
                    artefact_label: curr.artefact_label,
                    is_edit_flg: curr.is_edit_flg,
                    artefact_desc: curr.artefact_desc,
                    artefact_type_id: curr.artefact_type_id,
                    artefact_type_desc: curr.artefact_type_desc,
                    values: []
                }
                prev.push(newArtefact)
            }

            const artefactValue: ArtefactValue = {
                artefact_id: curr.artefact_id,
                is_active_flag: curr.is_active_flag,
                artefact_parent_value_id: curr.artefact_parent_value_id,
                artefact_value_id: curr.artefact_value_id,
                artefact_value: curr.artefact_value
            }

            if (artefactValue.artefact_value_id) {
                prev[prev.length - 1].values.push(artefactValue)
            }

            return prev
        }, [])
    }
}
