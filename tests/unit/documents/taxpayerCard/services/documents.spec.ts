import { IdentifierService } from '@diia-inhouse/crypto'
import Logger from '@diia-inhouse/diia-logger'
import { Task } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocStatus, HttpStatusCode } from '@diia-inhouse/types'

import { DocumentType, TaxpayerCard } from '@src/documents/taxpayerCard/interfaces/services'
import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'

import AnalyticsService from '@services/analytics'
import DocumentsService from '@services/documents'
import DocumentSettingsService from '@services/documentSettings'
import DocumentsExpirationService from '@services/documentsExpiration'
import DocumentStorageService from '@services/documentStorage'
import PassportService from '@services/passport'
import UserService from '@services/user'
import UserDocumentSettingsService from '@services/userDocumentSettings'

import DocumentsDataMapper from '@dataMappers/documentsDataMapper'

import Utils from '@utils/index'

import { getDocumentService } from '@mocks/stubs/documentDepsCollection'

import { userServiceClient } from '@tests/mocks/grpc/clients'

import { InternalPassportInstance } from '@interfaces/providers/eis'
import { PassportDocumentType, PassportDocumentTypeCamelCase } from '@interfaces/services/passport'

describe(`Service DocumentsService`, () => {
    const testKit = new TestKit()
    const analyticsService = mockInstance(AnalyticsService)
    const documentsExpirationService = mockInstance(DocumentsExpirationService)
    const documentStorageService = mockInstance(DocumentStorageService)
    const documentSettingsService = mockInstance(DocumentSettingsService)
    const passportService = mockInstance(PassportService)
    const taxpayerCardService = mockInstance(TaxpayerCardService)
    const userService = mockInstance(UserService)
    const userDocumentSettingsService = mockInstance(UserDocumentSettingsService)

    const documentsDataMapper = mockInstance(DocumentsDataMapper)

    const appUtils = mockInstance(Utils)

    const identifier = mockInstance(IdentifierService)
    const envService = mockInstance(EnvService)
    const logger = mockInstance(Logger)
    const task = mockInstance(Task)

    const service = new DocumentsService(
        analyticsService,
        [getDocumentService()],
        documentsExpirationService,
        documentStorageService,
        documentSettingsService,
        passportService,
        taxpayerCardService,
        userService,
        userServiceClient,
        userDocumentSettingsService,
        documentsDataMapper,
        appUtils,
        identifier,
        envService,
        logger,
        task,
    )
    const headers = testKit.session.getHeaders()
    const session = testKit.session.getUserSession()

    service.onRegistrationsFinished()

    describe(`method: getDocumentsToProcessV1`, () => {
        it('should return internal passport', async () => {
            const mockDocumentsFilter: string[] = [PassportDocumentType.InternalPassport]
            const documentTypeResponse = PassportDocumentTypeCamelCase.IdCard

            const getInternalPassportResponse = {
                documents: [<InternalPassportInstance>testKit.docs.generateDocument(PassportDocumentType.InternalPassport)],
                designSystemDocuments: [],
                unavailableDocuments: [],
                statusCode: HttpStatusCode.OK,
            }

            jest.spyOn(passportService, 'getInternalPassportDocuments').mockResolvedValueOnce(getInternalPassportResponse)

            const result = {
                [documentTypeResponse]: {
                    status: getInternalPassportResponse.statusCode,
                    data: getInternalPassportResponse.documents,
                },
            }

            const card = <TaxpayerCard>testKit.docs.generateDocument(DocumentType.TaxpayerCard)

            jest.spyOn(taxpayerCardService, 'getTaxpayerCard').mockResolvedValueOnce(card)

            expect(await service.getDocumentsToProcessV1(mockDocumentsFilter, session.user)).toMatchObject(result)
        })
    })

    describe(`method: saveDocumentsInUserProfile`, () => {
        it('should return undefined if taxpayer card given', async () => {
            jest.spyOn(envService, 'isProd').mockReturnValueOnce(true)

            const doc = <TaxpayerCard>testKit.docs.generateDocument(DocumentType.TaxpayerCard, { docStatus: DocStatus.Deleting })

            const result = await service.saveDocumentsInUserProfile(session.user.identifier, DocumentType.TaxpayerCard, [doc], headers)

            expect(result).toBeUndefined()
        })
    })
})
