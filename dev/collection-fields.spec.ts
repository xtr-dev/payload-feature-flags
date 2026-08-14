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
      options: {},
      expected: [
        'name',
        'description',
        'enabled',
        'rolloutPercentage',
        'variants',
        'tags',
        'metadata',
      ],
    },
    {
      description: 'rollouts and variants disabled',
      options: { enableRollouts: false, enableVariants: false },
      expected: ['name', 'description', 'enabled', 'tags', 'metadata'],
    },
    {
      description: 'only rollouts disabled',
      options: { enableRollouts: false },
      expected: ['name', 'description', 'enabled', 'variants', 'tags', 'metadata'],
    },
    {
      description: 'only variants disabled',
      options: { enableVariants: false },
      expected: ['name', 'description', 'enabled', 'rolloutPercentage', 'tags', 'metadata'],
    },
  ] satisfies Array<{
    description: string
    options: PayloadFeatureFlagsConfig
    expected: string[]
  }>)('$description', ({ options, expected }) => {
    expect(
      getCollection(options).fields.map((field) => ('name' in field ? field.name : undefined)),
    ).toEqual(expected)
  })

  test.each([
    { options: {}, expected: false },
    { options: { defaultValue: true }, expected: true },
  ] satisfies Array<{
    options: PayloadFeatureFlagsConfig
    expected: boolean
  }>)('sets enabled.defaultValue to $expected', ({ options, expected }) => {
    const enabled = getNamedField(getCollection(options).fields, 'enabled')

    expect(enabled).toMatchObject({ defaultValue: expected })
  })

  test('preserves conditional field constraints and conditions', () => {
    const fields = getCollection().fields
    const rolloutPercentage = getNamedField(fields, 'rolloutPercentage')
    const variants = getNamedField(fields, 'variants')

    expect(rolloutPercentage).toMatchObject({
      min: 0,
      max: 100,
      defaultValue: 100,
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

    expect(weight).toMatchObject({ required: true, min: 0, max: 100 })
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
