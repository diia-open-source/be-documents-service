import { createHash, randomUUID as uuid } from 'crypto'

import moment from 'moment'

import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { DocStatus, DocumentType, DocumentTypeCamelCase, HttpStatusCode, InternalPassport } from '@diia-inhouse/types'

import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'

import GetDesignSystemDocumentsToProcess from '@actions/v1/getDesignSystemDocumentsToProcess'

import DocumentAttributesService from '@services/documentAttributes'

import documentsExpirationModel from '@models/documentsExpiration'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v1/getDesignSystemDocumentsToProcess'
import { PassportType } from '@interfaces/dto'
import { DocumentsExpiration } from '@interfaces/models/documentsExpiration'

describe(`Action ${GetDesignSystemDocumentsToProcess.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetDesignSystemDocumentsToProcess
    let external: ExternalCommunicator
    let passportDataMapper: PassportDataMapper
    let taxpayerCardService: TaxpayerCardService
    let documentAttributesService: DocumentAttributesService

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetDesignSystemDocumentsToProcess)
        external = app.container.resolve('external')
        passportDataMapper = app.container.resolve<PassportDataMapper>('passportDataMapper')
        taxpayerCardService = app.container.resolve<TaxpayerCardService>('taxpayerCardService')
        documentAttributesService = app.container.resolve<DocumentAttributesService>('documentAttributesService')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    describe('Request with eTag', () => {
        it(`should return ${DocumentType.InternalPassport} when eTag not equal`, async () => {
            // Arrange
            const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
            const user = actionArgs.session.user
            const headers = actionArgs.headers

            const savedETag = uuid()

            const { _id: expirationModelId } = await documentsExpirationModel.create<DocumentsExpiration>({
                userIdentifier: user.identifier,
                mobileUid: headers.mobileUid,
                [DocumentType.InternalPassport]: {
                    date: moment().add(1, 'year').toDate(),
                    eTag: savedETag,
                },
            })

            jest.spyOn(documentAttributesService, 'getUpdatedAtValue').mockReturnValue('')

            const passport = getPassport()
            const idCardPassports = passportDataMapper.toDocumentInstance(PassportType.ID, passport, { items: [] })

            const actualETag = createHash('md5').update(JSON.stringify(idCardPassports)).digest('base64')

            jest.spyOn(taxpayerCardService, 'getTaxpayerCardTableOrg').mockResolvedValueOnce({ items: [] })
            jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(passport)

            // Act
            const result = await action.handler({
                ...actionArgs,
                params: {
                    documents: [{ type: DocumentTypeCamelCase.idCard, eTag: actualETag }],
                },
            })

            // Assert
            const expirationModel = await documentsExpirationModel.findById(expirationModelId)

            expect(expirationModel?.[DocumentType.InternalPassport]?.eTag).toEqual(actualETag)
            expect(expirationModel?.[DocumentType.InternalPassport]?.date.getTime()).toBeGreaterThan(new Date().getTime())

            expect(result).toMatchObject<ActionResult>({
                [DocumentTypeCamelCase.idCard]: {
                    status: HttpStatusCode.OK,
                    data: [
                        expect.objectContaining<Partial<InternalPassport>>({
                            id: '20000213-01467-2016-03-09',
                            docStatus: DocStatus.Ok,
                            docNumber: '000031886',
                        }),
                    ],
                    eTag: actualETag,
                },
            })
        })

        it(`should return ${DocumentType.InternalPassport} when eTag equal, date expired`, async () => {
            // Arrange
            const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
            const user = actionArgs.session.user
            const headers = actionArgs.headers

            jest.spyOn(documentAttributesService, 'getUpdatedAtValue').mockReturnValue('')

            const passport = getPassport()
            const idCardPassports = passportDataMapper.toDocumentInstance(PassportType.ID, passport, { items: [] })

            const previousEtag = uuid()
            const actualETag = createHash('md5').update(JSON.stringify(idCardPassports)).digest('base64')

            const { _id: expirationModelId } = await documentsExpirationModel.create<DocumentsExpiration>({
                userIdentifier: user.identifier,
                mobileUid: headers.mobileUid,
                [DocumentType.InternalPassport]: {
                    date: moment().subtract(1, 'year').toDate(),
                    eTag: previousEtag,
                },
            })

            jest.spyOn(taxpayerCardService, 'getTaxpayerCardTableOrg').mockResolvedValueOnce({ items: [] })
            jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(passport)

            // Act
            const result = await action.handler({
                ...actionArgs,
                params: {
                    documents: [{ type: DocumentTypeCamelCase.idCard, eTag: previousEtag }],
                },
            })

            // Assert
            const expirationModel = await documentsExpirationModel.findById(expirationModelId)

            expect(expirationModel?.[DocumentType.InternalPassport]?.eTag).toEqual(actualETag)
            expect(expirationModel?.[DocumentType.InternalPassport]?.date.getTime()).toBeGreaterThan(new Date().getTime())

            expect(result).toMatchObject<ActionResult>({
                [DocumentTypeCamelCase.idCard]: {
                    status: HttpStatusCode.OK,
                    data: [
                        expect.objectContaining<Partial<InternalPassport>>({
                            id: '20000213-01467-2016-03-09',
                            docStatus: DocStatus.Ok,
                            docNumber: '000031886',
                        }),
                    ],
                    eTag: actualETag,
                },
            })
        })

        it(`should not return ${DocumentType.InternalPassport} when eTag equal, date not expired`, async () => {
            // Arrange
            const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
            const user = actionArgs.session.user
            const headers = actionArgs.headers

            jest.spyOn(documentAttributesService, 'getUpdatedAtValue').mockReturnValue('')

            const passport = getPassport()
            const idCardPassports = passportDataMapper.toDocumentInstance(PassportType.ID, passport, { items: [] })

            const actualETag = createHash('md5').update(JSON.stringify(idCardPassports)).digest('base64')

            const expireAt = moment().add(1, 'year').toDate()

            const { _id: expirationModelId } = await documentsExpirationModel.create<DocumentsExpiration>({
                userIdentifier: user.identifier,
                mobileUid: headers.mobileUid,
                [DocumentType.InternalPassport]: {
                    date: expireAt,
                    eTag: actualETag,
                },
            })

            jest.spyOn(taxpayerCardService, 'getTaxpayerCardTableOrg').mockResolvedValueOnce({ items: [] })
            jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(passport)

            // Act
            const result = await action.handler({
                ...actionArgs,
                params: {
                    documents: [{ type: DocumentTypeCamelCase.idCard, eTag: actualETag }],
                },
            })

            // Assert
            const expirationModel = await documentsExpirationModel.findById(expirationModelId)

            expect(expirationModel?.[DocumentType.InternalPassport]?.eTag).toEqual(actualETag)
            expect(expirationModel?.[DocumentType.InternalPassport]?.date.getTime()).toEqual(expireAt.getTime())

            expect(result).toEqual<ActionResult>({})
        })
    })
})
