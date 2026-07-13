import { resolveActiveQuarter } from './quarter-availability'

const originalTimeZone = process.env.TZ
process.env.TZ = 'Europe/Moscow'

describe('resolveActiveQuarter', () => {
  afterAll(() => {
    if (originalTimeZone) {
      process.env.TZ = originalTimeZone
    } else {
      delete process.env.TZ
    }
  })

  it.each([
    {
      now: new Date(2026, 3, 1, 0, 0, 0, 0),
      quarter: 1,
      year: 2026
    },
    {
      now: new Date(2026, 3, 30, 23, 59, 59, 999),
      quarter: 1,
      year: 2026
    },
    {
      now: new Date(2026, 4, 1, 0, 0, 0, 0),
      quarter: 2,
      year: 2026
    },
    {
      now: new Date(2026, 6, 1, 0, 0, 0, 0),
      quarter: 2,
      year: 2026
    },
    {
      now: new Date(2026, 6, 31, 23, 59, 59, 999),
      quarter: 2,
      year: 2026
    },
    {
      now: new Date(2026, 7, 1, 0, 0, 0, 0),
      quarter: 3,
      year: 2026
    },
    {
      now: new Date(2026, 9, 1, 0, 0, 0, 0),
      quarter: 3,
      year: 2026
    },
    {
      now: new Date(2026, 10, 1, 0, 0, 0, 0),
      quarter: 4,
      year: 2026
    },
    {
      now: new Date(2027, 0, 31, 23, 59, 59, 999),
      quarter: 4,
      year: 2026
    },
    {
      now: new Date(2027, 1, 1, 0, 0, 0, 0),
      quarter: 1,
      year: 2027
    }
  ])('selects Q$quarter $year for $now', ({ now, quarter, year }) => {
    expect(resolveActiveQuarter(now)).toMatchObject({ quarter, year })
  })

  it('returns quarter boundaries and the end of the following calendar month', () => {
    expect(resolveActiveQuarter(new Date(2026, 6, 13, 12, 0, 0, 0))).toEqual({
      quarter: 2,
      year: 2026,
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      maxDate: '2026-07-31'
    })
  })

  it('handles a leap-year first quarter', () => {
    expect(resolveActiveQuarter(new Date(2028, 3, 15, 12, 0, 0, 0))).toEqual({
      quarter: 1,
      year: 2028,
      startDate: '2028-01-01',
      endDate: '2028-03-31',
      maxDate: '2028-04-30'
    })
  })

  it('uses the backend timezone at the availability boundary', () => {
    expect(
      resolveActiveQuarter(new Date('2026-07-31T20:59:59.999Z'))
    ).toMatchObject({ quarter: 2, year: 2026 })
    expect(
      resolveActiveQuarter(new Date('2026-07-31T21:00:00.000Z'))
    ).toMatchObject({ quarter: 3, year: 2026 })
  })
})
