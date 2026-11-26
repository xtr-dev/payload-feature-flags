import type { CollectionConfig, Config, Field } from 'payload'

import { describe, expect, test, vi } from 'vitest'

import { payloadFeatureFlags, type PayloadFeatureFlagsConfig } from '../src/index.js'

const getCollection = (options: PayloadFeatureFlagsConfig = {}): CollectionConfig => {
  const config = payloadFeatureFlags(options)({} as Config)

  return config.collections?.[0] as CollectionConfig
}

const getNamedField = (fields: Field[], name: string) =>
  fields.find((field) => 'name' in field && field.name === name)

describe('payloadFeatureFlags collection fields', () => {
  test.each([
    {
      description: 'default options',
      expected: [
        'name',
        'description',
        'enabled',
        'rolloutPercentage',
        'variants',
        'tags',
        'metadata',
      ],
      options: {},
    },
    {
      description: 'rollouts and variants disabled',
      expected: ['name', 'description', 'enabled', 'tags', 'metadata'],
      options: { enableRollouts: false, enableVariants: false },
    },
    {
      description: 'only rollouts disabled',
      expected: ['name', 'description', 'enabled', 'variants', 'tags', 'metadata'],
      options: { enableRollouts: false },
    },
    {
      description: 'only variants disabled',
      expected: ['name', 'description', 'enabled', 'rolloutPercentage', 'tags', 'metadata'],
      options: { enableVariants: false },
    },
  ] satisfies Array<{
    description: string
    expected: string[]
    options: PayloadFeatureFlagsConfig
  }>)('$description', ({ expected, options }) => {
    expect(
      getCollection(options).fields.map((field) => ('name' in field ? field.name : undefined)),
    ).toEqual(expected)
  })

  test.each([
    { expected: false, options: {} },
    { expected: true, options: { defaultValue: true } },
  ] satisfies Array<{
    expected: boolean
    options: PayloadFeatureFlagsConfig
  }>)('sets enabled.defaultValue to $expected', ({ expected, options }) => {
    const enabled = getNamedField(getCollection(options).fields, 'enabled')

    expect(enabled).toMatchObject({ defaultValue: expected })
  })

  test('name field is required and unique', () => {
    const name = getNamedField(getCollection().fields, 'name')

    expect(name).toMatchObject({ required: true, unique: true })
  })

  test('enabled field is required', () => {
    const enabled = getNamedField(getCollection().fields, 'enabled')

    expect(enabled).toMatchObject({ required: true })
  })

  test('preserves conditional field constraints and conditions', () => {
    const fields = getCollection().fields
    const rolloutPercentage = getNamedField(fields, 'rolloutPercentage')
    const variants = getNamedField(fields, 'variants')

    expect(rolloutPercentage).toMatchObject({
      defaultValue: 100,
      max: 100,
      min: 0,
    })
    expect(variants).toMatchObject({ type: 'array' })

    if (!rolloutPercentage || !('admin' in rolloutPercentage)) {
      throw new Error('rolloutPercentage field is missing')
    }
    if (!variants || variants.type !== 'array') {
      throw new Error('variants array field is missing')
    }

    const rolloutCondition = rolloutPercentage.admin?.condition
    const variantsCondition = variants.admin?.condition
    const weight = getNamedField(variants.fields, 'weight')

    expect(weight).toMatchObject({ max: 100, min: 0, required: true })
    expect(rolloutCondition).toBeTypeOf('function')
    expect(variantsCondition).toBeTypeOf('function')

    for (const condition of [rolloutCondition, variantsCondition]) {
      const evaluate = condition as (data?: { enabled?: boolean }) => unknown

      expect(evaluate({ enabled: true })).toBe(true)
      expect(evaluate({ enabled: false })).toBeFalsy()
      expect(evaluate(undefined)).toBeFalsy()
    }
  })

  test('passes all default fields to the field override callback', () => {
    const extraField: Field = { name: 'extra', type: 'text' }
    const fields = vi.fn(({ defaultFields }: { defaultFields: Field[] }) => [
      ...defaultFields,
      extraField,
    ])

    const collection = getCollection({ collectionOverrides: { fields } })

    expect(fields).toHaveBeenCalledOnce()
    expect(fields.mock.calls[0]?.[0].defaultFields).toHaveLength(7)
    expect(collection.fields.at(-1)).toBe(extraField)
  })
})
