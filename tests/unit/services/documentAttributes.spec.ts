import { AsyncLocalStorage } from 'async_hooks'

import moment from 'moment'

import { InternalServerError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import {
    ActHeaders,
    AlsData,
    DocStatus,
    DocumentType,
    Localization,
    PlatformType,
    TickerAtmType,
    TickerAtmUsage,
} from '@diia-inhouse/types'

import DocumentAttributesService from '@services/documentAttributes'

import PluginDepsCollectionMock from '@mocks/stubs/documentDepsCollection'

import { DocumentTickerCode } from '@interfaces/services/documentAttributes'

describe(`Service ${DocumentAttributesService.name}`, () => {
    const testKit = new TestKit()
    const now = new Date()
    const nowFormatted = moment(now).format('HH:mm | DD.MM.YYYY')
    const asyncLocalStorage = <AsyncLocalStorage<AlsData>>(<unknown>{ getStore: jest.fn() })
    const service = new DocumentAttributesService(new PluginDepsCollectionMock([]), asyncLocalStorage)

    beforeAll(() => {
        jest.useFakeTimers({ now })
    })

    afterAll(() => {
        jest.useRealTimers()
    })

    describe(`method ${service.getCover.name}`, () => {
        it('should return undefined if no cover found for passed document type and document status', () => {
            const result = service.getCover(DocumentType.MilitaryBond, DocStatus.NoPhoto)

            expect(result).toBeUndefined()
        })
    })

    describe(`method ${service.getTicker.name}`, () => {
        it('should throw error if ticker is not defined for passed params', () => {
            const params = {
                documentType: <DocumentType>'unknown',
                code: DocumentTickerCode.OneDose,
                templateParams: { validUntil: '2039-10-11', updatedAt: '2020-10-10' },
                localization: Localization.ENG,
            }

            expect(() => service.getTicker(params)).toThrow(new InternalServerError('Ticker not defined'))
        })
    })

    describe(`method ${service.getDefaultTicker.name}`, () => {
        it.each([
            [
                Localization.ENG,
                {
                    usage: TickerAtmUsage.document,
                    type: TickerAtmType.positive,
                    value: `Document updated on ${nowFormatted} • Document updated on ${nowFormatted} • `,
                },
            ],
            [
                Localization.UA,
                {
                    usage: TickerAtmUsage.document,
                    type: TickerAtmType.positive,
                    value: `Документ оновлено о ${nowFormatted} • Документ оновлено о ${nowFormatted} • `,
                },
            ],
        ])('should return default ticker for %s localization', (localization, expected) => {
            const result = service.getDefaultTicker(localization)

            expect(result).toEqual(expected)
        })
    })

    describe(`method ${service.getTrident.name}`, () => {
        it.each([
            [
                `with space prefix when platform type is ${PlatformType.iOS}, app version is 3.0.43.906 and document type id ${DocumentType.ForeignPassport}`,
                { headers: testKit.session.getHeaders({ platformType: PlatformType.iOS, appVersion: '3.0.43.906' }) },
                DocumentType.ForeignPassport,
                ' |_|_|',
            ],
            [
                `when platform type is ${PlatformType.iOS}, app version is 3.0.43.906 and document type id ${DocumentType.BirthCertificate}`,
                { headers: testKit.session.getHeaders({ platformType: PlatformType.iOS, appVersion: '3.0.43.906' }) },
                DocumentType.BirthCertificate,
                '|_|_|',
            ],
            [
                `when platform type is ${PlatformType.Browser} and document type id ${DocumentType.ForeignPassport}`,
                { headers: testKit.session.getHeaders({ platformType: PlatformType.Browser }) },
                DocumentType.ForeignPassport,
                '|_|_|',
            ],
            ['when store was not initialized', undefined, DocumentType.ForeignPassport, '|_|_|'],
            ['when store has no headers', {}, DocumentType.DriverLicense, '|_|_|'],
            ['when headers has no platform type', { headers: <ActHeaders>{ appVersion: '3.0.5.6' } }, DocumentType.DriverLicense, '|_|_|'],
            [
                'when headers has no app version',
                { headers: <ActHeaders>{ platformType: PlatformType.Android } },
                DocumentType.DriverLicense,
                '|_|_|',
            ],
        ])('should return trident %s', (_msg, alsData, documentType, expected) => {
            const getStoreSpy = jest.spyOn(asyncLocalStorage, 'getStore').mockReturnValueOnce(alsData)

            const result = service.getTrident(documentType)

            expect(result).toEqual(expected)
            expect(asyncLocalStorage.getStore).toHaveBeenCalled()

            getStoreSpy.mockClear()
        })
    })
})
