import { ModelsService } from '../models/models.service'
import { ModelDisplayModeService } from '../models/services/model-display-mode.service'
import { ModelVisibilityService } from '../models/services/model-visibility.service'
import { QuarterlyConfirmationService } from './quarterly-confirmation.service'
import {
  MODEL_DISPLAY_MODES,
  MODEL_SOURCES,
  MODEL_STATUS
} from 'src/system/common/constants'

jest.mock('@nestjs/axios', () => ({ HttpService: jest.fn() }))

describe('Quarterly confirmation registry consistency', () => {
  const department = 'Департамент розничных кредитных рисков'
  const groups = [`/departament_business_customer/${department}`]
  let registry: ModelsService
  let service: QuarterlyConfirmationService

  beforeEach(() => {
    registry = new ModelsService(
      null,
      null,
      null,
      null,
      null,
      new ModelDisplayModeService(),
      new ModelVisibilityService(),
      null,
      null,
      null
    )
    const model = (id: string, fields = {}) => ({
      system_model_id: id,
      model_id: id,
      model_source: MODEL_SOURCES.MRM,
      business_customer_departament: department,
      ...fields
    })
    jest.spyOn(registry as any, 'fetchAndMergeModels').mockResolvedValue([
      model('sum-with-surrogate-error', {
        model_source: MODEL_SOURCES.SUM,
        delete_status: MODEL_STATUS.CREATION_ERROR
      }),
      model('mrm-without-business-id', { model_id: null }),
      model('mrm-with-blank-business-id', { model_id: '' }),
      model('empty-internal-name', {
        model_name_validation: '',
        model_name: 'Current DADM name',
        model_name_dadm: 'Legacy DADM name'
      }),
      model('internal-name-only', { model_name_validation: 'Internal name' }),
      model('pending-delete', { delete_status: MODEL_STATUS.PENDING_DELETE }),
      model('creation-error', { delete_status: MODEL_STATUS.CREATION_ERROR }),
      model('archive', { model_status: MODEL_STATUS.ARCHIVE }),
      model('sum-creation-error', {
        model_source: MODEL_SOURCES.SUM,
        model_status: MODEL_STATUS.CREATION_ERROR
      }),
      model('other-department', {
        business_customer_departament: 'Другой департамент'
      })
    ])
    jest.spyOn(registry, 'getArtefactLabels').mockResolvedValue([])
    const db = { query: jest.fn().mockResolvedValue([]) }
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    const pim = { getPimUsageForModels: jest.fn().mockResolvedValue([]) }
    service = new QuarterlyConfirmationService(
      db as any,
      db as any,
      logger as any,
      pim as any,
      null,
      registry
    )
    jest.spyOn(service, 'getActiveQuarter').mockReturnValue({
      quarter: 3,
      year: 2026,
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      maxDate: '2026-10-02'
    })
  })

  it('returns exactly the active registry models, including missing business IDs and SUM surrogate errors', async () => {
    const active = await registry.getModels(
      { mode: [MODEL_DISPLAY_MODES.ACTIVE] },
      groups
    )
    const rows = await service.getModelsForConfirmation('', '', groups, 'test')
    const ids = rows.map((row) => row.system_model_id).sort()
    expect(ids).toEqual(active.map((row) => row.system_model_id).sort())
    expect(ids).toEqual([
      'empty-internal-name',
      'internal-name-only',
      'mrm-with-blank-business-id',
      'mrm-without-business-id',
      'sum-with-surrogate-error'
    ])
    expect(
      rows.find((row) => row.system_model_id === 'mrm-without-business-id')
        .model_id
    ).toBe('')
  })

  it('preserves separate names and uses the same DADM field as the registry', async () => {
    const rows = await service.getModelsForConfirmation('', '', groups, 'test')
    expect(
      rows.find((row) => row.system_model_id === 'empty-internal-name')
    ).toMatchObject({
      model_name_validation: '',
      model_name: 'Current DADM name',
      model_name_dadm: 'Current DADM name',
      registry_card: {
        model_name_validation: '',
        model_name: 'Current DADM name'
      }
    })
    expect(
      rows.find((row) => row.system_model_id === 'internal-name-only')
    ).toMatchObject({
      model_name_validation: 'Internal name',
      model_name: null,
      model_name_dadm: null
    })
  })

  it('filters internal and DADM names independently while searching both', async () => {
    const byInternalName = await service.getModelsForConfirmation(
      '',
      '',
      groups,
      'test',
      { model_name: 'DADM' }
    )
    expect(byInternalName).toEqual([])
    const byDadm = await service.getModelsForConfirmation(
      '',
      '',
      groups,
      'test',
      { model_name_dadm: 'Current DADM' }
    )
    expect(byDadm.map((row) => row.system_model_id)).toEqual([
      'empty-internal-name'
    ])
    const bySearch = await service.getModelsForConfirmation(
      '',
      '',
      groups,
      'test',
      { search: 'Internal name' }
    )
    expect(bySearch.map((row) => row.system_model_id)).toEqual([
      'internal-name-only'
    ])
  })
})
