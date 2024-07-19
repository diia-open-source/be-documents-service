import { AsyncLocalStorage } from 'node:async_hooks'

import moment from 'moment'

import { InternalServerError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import { ActHeaders, AlsData, DocStatus, Localization, PlatformType, TickerAtm, TickerAtmType, TickerAtmUsage } from '@diia-inhouse/types'

import { DocumentType } from '@src/documents/driverLicense/interfaces/services'
import DriverLicenseAttributesService from '@src/documents/driverLicense/services/documentAttributes'

import DocumentAttributesService from '@services/documentAttributes'

import { DocumentTickerCode } from '@interfaces/services/documentAttributes'
import { PassportDocumentType } from '@interfaces/services/passport'

describe(`Service ${DocumentAttributesService.name}`, () => {
    const testKit = new TestKit()
    const now = new Date()
    const nowFormatted = moment(now).format('HH:mm | DD.MM.YYYY')
    const asyncLocalStorage = <AsyncLocalStorage<AlsData>>(<unknown>{ getStore: jest.fn() })
    const service = new DocumentAttributesService([new DriverLicenseAttributesService()], asyncLocalStorage)

    service.onRegistrationsFinished()

    beforeAll(() => {
        jest.useFakeTimers({ now })
    })

    afterAll(() => {
        jest.useRealTimers()
    })

    describe(`method ${service.getCover.name}`, () => {
        it.each([
            [DocumentType.DriverLicense, DocStatus.NoPhoto],
            [DocumentType.DriverLicense, DocStatus.OldModel],
        ])('should return cover when document type %s and doc status %s are passed', (documentType, docStatus) => {
            const result = service.getCover(documentType, docStatus)

            expect(result).toEqual({
                title: expect.any(String),
                text: expect.any(String),
                actionButton: {
                    name: expect.any(String),
                    action: expect.any(String),
                },
            })
        })

        it('should return undefined if no cover found for passed document type and document status', () => {
            const result = service.getCover(<DocumentType>'document-type', DocStatus.NoPhoto)

            expect(result).toBeUndefined()
        })
    })

    describe(`method ${service.getTickerV1.name}`, () => {
        it.each([
            [
                `document type ${DocumentType.DriverLicense} and code ${DocumentTickerCode.ValidUntil} are passed`,
                {
                    type: 'info',
                    text: `Дійсне до 2039-10-11 • УКРАЇНА • Дійсне до 2039-10-11 • УКРАЇНА • `,
                },
                DocumentType.DriverLicense,
                DocumentTickerCode.ValidUntil,
                undefined,
                { validUntil: '2039-10-11' },
            ],
            [
                `document type ${DocumentType.DriverLicense}, code ${DocumentTickerCode.ValidUntil} and localization ${Localization.ENG} are passed`,
                {
                    type: 'info',
                    text: `Valid until 2029-08-12 • UKRAINE • Valid until 2029-08-12 • UKRAINE • `,
                },
                DocumentType.DriverLicense,
                DocumentTickerCode.ValidUntil,
                Localization.ENG,
                { validUntil: '2029-08-12' },
            ],
        ])('should return ticker when %s', (_msg, expected, documentType, tickerCode, localization?, templateParams?) => {
            const result = service.getTickerV1(documentType, tickerCode, localization, templateParams)

            expect(result).toEqual(expected)
        })
    })

    describe(`method ${service.getTicker.name}`, () => {
        it.each([
            [
                `document type ${DocumentType.DriverLicense} and code ${DocumentTickerCode.ValidUntil} are passed`,
                {
                    documentType: DocumentType.DriverLicense,
                    code: DocumentTickerCode.ValidUntil,
                    templateParams: { validUntil: '2039-10-11', updatedAt: '2020-10-10' },
                },
                {
                    usage: TickerAtmUsage.document,
                    type: TickerAtmType.positive,
                    value: `Дійсне до 2039-10-11 • Документ оновлено о 2020-10-10 • `,
                    componentId: 'ticker_ua',
                },
            ],
        ])('should return ticker when %s', (_msg, params, expected) => {
            const result = service.getTicker(params)

            expect(result).toEqual(expected)
        })

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
        it.each(<[Localization, TickerAtm][]>[
            [
                Localization.ENG,
                {
                    usage: TickerAtmUsage.document,
                    type: TickerAtmType.positive,
                    value: `Document updated on ${nowFormatted} • Document updated on ${nowFormatted} • `,
                    componentId: 'ticker_eng',
                    action: undefined,
                },
            ],
            [
                Localization.UA,
                {
                    usage: TickerAtmUsage.document,
                    type: TickerAtmType.positive,
                    value: `Документ оновлено о ${nowFormatted} • Документ оновлено о ${nowFormatted} • `,
                    componentId: 'ticker_ua',
                    action: undefined,
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
                `with space prefix when platform type is ${PlatformType.Huawei}, app version is 3.0.51.957 and document type id ${DocumentType.DriverLicense}`,
                { headers: testKit.session.getHeaders({ platformType: PlatformType.Huawei, appVersion: '3.0.51.957' }) },
                DocumentType.DriverLicense,
                ' |_|_|',
            ],
            [
                `with space prefix when platform type is ${PlatformType.iOS}, app version is 3.0.43.906 and document type id ${PassportDocumentType.ForeignPassport}`,
                { headers: testKit.session.getHeaders({ platformType: PlatformType.iOS, appVersion: '3.0.43.906' }) },
                PassportDocumentType.ForeignPassport,
                ' |_|_|',
            ],
            [
                `when platform type is ${PlatformType.Browser} and document type id ${PassportDocumentType.ForeignPassport}`,
                { headers: testKit.session.getHeaders({ platformType: PlatformType.Browser }) },
                PassportDocumentType.ForeignPassport,
                '|_|_|',
            ],
            ['when store was not initialized', undefined, PassportDocumentType.ForeignPassport, '|_|_|'],
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
