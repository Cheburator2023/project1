import { ModelsService } from './models.service'

jest.mock('@nestjs/axios', () => ({ HttpService: jest.fn() }))

describe('SURM model creation names', () => {
  let service: ModelsService
  let database: { query: jest.Mock }
  let updateArtefacts: jest.SpyInstance

  beforeEach(() => {
    database = { query: jest.fn().mockResolvedValue([{}]) }
    service = new ModelsService(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      database as any,
      null
    )
    updateArtefacts = jest
      .spyOn(service as any, 'executeDatabaseUpdates')
      .mockResolvedValue(undefined)
    jest.spyOn(service, 'getModels').mockResolvedValue([])
  })

  it.each([undefined, '', 'Explicit DADM name'])(
    'stores only the supplied DADM name (%s)',
    async (dadmName) => {
      const artefacts = [
        {
          artefact_tech_label: 'model_name_validation',
          artefact_string_value: 'Internal name',
          artefact_value_id: null
        }
      ]
      if (dadmName !== undefined) {
        artefacts.push({
          artefact_tech_label: 'model_name',
          artefact_string_value: dadmName,
          artefact_value_id: null
        })
      }
      await service.modelCreate(artefacts, { username: 'test' })
      expect(database.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model_name: dadmName ?? null
        })
      )
      const saved = updateArtefacts.mock.calls[0][0].artefactsForUpdate
      expect(saved).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            artefact_tech_label: 'model_name_validation',
            artefact_string_value: 'Internal name'
          })
        ])
      )
      expect(
        saved.some((artefact) => artefact.artefact_tech_label === 'model_name')
      ).toBe(false)
    }
  )

  it('still requires an internal name when a DADM name is provided', async () => {
    await expect(
      service.modelCreate(
        [
          {
            artefact_tech_label: 'model_name',
            artefact_string_value: 'DADM name',
            artefact_value_id: null
          }
        ],
        { username: 'test' }
      )
    ).rejects.toThrow()
    expect(database.query).not.toHaveBeenCalled()
  })
})
