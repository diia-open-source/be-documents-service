jest.mock('glob', () => {
    const origin = jest.requireActual('glob')

    return {
        ...origin,
        globSync: (mask: string): string[] => {
            if (mask === 'dist/documents/*/config.js') {
                return origin.globSync('src/documents/*/config.ts')
            }

            return origin.globSync(mask)
        },
    }
})

import { EnvService } from '@diia-inhouse/env'
import { mockInstance } from '@diia-inhouse/test'

import { getConfigs, mergeConfigs } from '@src/documents/config'

describe('mergeConfigs', () => {
    it.each([
        [
            'merge just source array into destination in case destination is not array',
            { foo: 'bar', bar: 'bar' },
            { foo: ['foo', 'bar'], bar: 'foo' },
            { foo: ['foo', 'bar'], bar: 'foo' },
        ],
        [
            'merge source array into destination array',
            { foo: ['bar'], bar: 'bar' },
            { foo: ['foo', 'bar'], bar: 'foo' },
            { foo: ['bar', 'foo'], bar: 'foo' },
        ],
        [
            'merge nested source object into destination which is not object',
            { foo: 'bar', bar: 'bar' },
            { foo: { foo: ['bar'], bar: 'foo' }, bar: 'foo' },
            { foo: { foo: ['bar'], bar: 'foo' }, bar: 'foo' },
        ],
        [
            'merge nested source object into destination which is null',
            { foo: null, bar: 'bar' },
            { foo: { foo: ['bar'], bar: 'foo' }, bar: 'foo' },
            { foo: { foo: ['bar'], bar: 'foo' }, bar: 'foo' },
        ],
        [
            'merge nested source object into destination which is undefined',
            { bar: 'bar' },
            { foo: { foo: ['bar'], bar: 'foo' }, bar: 'foo' },
            { foo: { foo: ['bar'], bar: 'foo' }, bar: 'foo' },
        ],
        [
            'merge nested source object into destination object',
            { foo: { foo: 'bar', bar: 'foo' }, bar: 'bar' },
            { foo: { foo: ['bar'] }, bar: 'foo' },
            { foo: { foo: ['bar'], bar: 'foo' }, bar: 'foo' },
        ],
        [
            'just return destination object in case source is not valid',
            { foo: { foo: ['bar'], bar: 'foo' }, bar: 'bar' },
            <Record<string, unknown>>(<unknown>null),
            { foo: { foo: ['bar'], bar: 'foo' }, bar: 'bar' },
        ],
    ])('should %s', (_msg, destination, source, expectedResult) => {
        const result = mergeConfigs(destination, source)

        expect(result).toEqual(expectedResult)
    })
})

describe('getConfigs', () => {
    it('should successfully compose and return plugin config', async () => {
        const envService = mockInstance(EnvService)
        const serviceName = 'Documents'

        const result = await getConfigs(envService, serviceName)

        expect(result).toEqual(expect.any(Object))
    })
})
