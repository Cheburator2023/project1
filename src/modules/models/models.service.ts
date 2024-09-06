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
            .filter(item => ['4', '11'].includes(item.artefact_type_id))
            .map(artefact => artefact.artefact_tech_label)
            .concat('update_date')
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
            {
                artefact_id: 2201,
                artefact_tech_label: 'usage_confirm_date_q1',
                artefact_label: '1Q',
                is_edit_flg: '1',
                artefact_desc: '',
                artefact_type_id: '11',
                artefact_type_desc: 'quarterly_date',
                values: [],
                start_date_depend_artefact: 'create_date'
            },
            {
                artefact_id: 2202,
                artefact_tech_label: 'usage_confirm_date_q2',
                artefact_label: '2Q',
                is_edit_flg: '1',
                artefact_desc: '',
                artefact_type_id: '11',
                artefact_type_desc: 'quarterly_date',
                values: [],
                start_date_depend_artefact: 'create_date'
            },
            {
                artefact_id: 2203,
                artefact_tech_label: 'usage_confirm_date_q3',
                artefact_label: '3Q',
                is_edit_flg: '1',
                artefact_desc: '',
                artefact_type_id: '11',
                artefact_type_desc: 'quarterly_date',
                values: [],
                start_date_depend_artefact: 'create_date'
            },
            {
                artefact_id: 2204,
                artefact_tech_label: 'usage_confirm_date_q4',
                artefact_label: '4Q',
                is_edit_flg: '1',
                artefact_desc: '',
                artefact_type_id: '11',
                artefact_type_desc: 'quarterly_date',
                values: [],
                start_date_depend_artefact: 'create_date'
            },

            {
                artefact_id: 2201,
                artefact_tech_label: 'usage_confirm_date_q1',
                artefact_label: '1Q',
                is_edit_flg: '1',
                artefact_desc: '',
                artefact_type_id: '11',
                artefact_type_desc: 'quarterly_date',
                values: [],
                start_date_depend_artefact: 'create_date'
            },
            {
                artefact_id: 2202,
                artefact_tech_label: 'usage_confirm_date_q2',
                artefact_label: '2Q',
                is_edit_flg: '1',
                artefact_desc: '',
                artefact_type_id: '11',
                artefact_type_desc: 'quarterly_date',
                values: [],
                start_date_depend_artefact: 'create_date'
            },
            {
                artefact_id: 2203,
                artefact_tech_label: 'usage_confirm_date_q3',
                artefact_label: '3Q',
                is_edit_flg: '1',
                artefact_desc: '',
                artefact_type_id: '11',
                artefact_type_desc: 'quarterly_date',
                values: [],
                start_date_depend_artefact: 'create_date'
            },
            {
                artefact_id: 2204,
                artefact_tech_label: 'usage_confirm_date_q4',
                artefact_label: '4Q',
                is_edit_flg: '1',
                artefact_desc: '',
                artefact_type_id: '11',
                artefact_type_desc: 'quarterly_date',
                values: [],
                start_date_depend_artefact: 'create_date'
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
