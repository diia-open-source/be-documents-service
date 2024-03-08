import { randomUUID } from 'crypto'

import { IdentifierService } from '@diia-inhouse/crypto'
import Logger from '@diia-inhouse/diia-logger'
import { Task } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import { AccessDeniedError, BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import {
    AppUser,
    DocStatus,
    DocumentType,
    HttpStatusCode,
    InternalPassport,
    OwnerType,
    ProfileFeature,
    SessionType,
    UserSession,
} from '@diia-inhouse/types'

import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'

import AnalyticsService from '@services/analytics'
import DocumentsService from '@services/documents'
import DocumentsExpirationService from '@services/documentsExpiration'
import DocumentStorageService from '@services/documentStorage'
import PassportService from '@services/passport'
import UserService from '@services/user'

import DocumentsDataMapper from '@dataMappers/documentsDataMapper'

import Utils from '@utils/index'

import PluginDepsCollectionMock, { getDocumentService } from '@mocks/stubs/documentDepsCollection'

import { DocumentsExpirationModel } from '@interfaces/models/documentsExpiration'
import { DocumentTypeResponse, DocumentsFeaturePointsExistence, GetDocumentsResult } from '@interfaces/services/documents'
import { UserProfileAddDocumentsMessage, UserProfileDocument } from '@interfaces/services/user'

describe(`Service DocumentsService`, () => {
    const testKit = new TestKit()
    const analyticsService = mockInstance(AnalyticsService)
    const pluginCollection = new PluginDepsCollectionMock([getDocumentService()])
    const documentsExpirationService = mockInstance(DocumentsExpirationService)
    const documentStorageService = mockInstance(DocumentStorageService)
    const passportService = mockInstance(PassportService)
    const taxpayerCardService = mockInstance(TaxpayerCardService)
    const userService = mockInstance(UserService)

    const documentsDataMapper = mockInstance(DocumentsDataMapper)

    const appUtils = mockInstance(Utils)

    const identifier = mockInstance(IdentifierService)
    const envService = mockInstance(EnvService)
    const logger = mockInstance(Logger)
    const task = mockInstance(Task)

    const service = new DocumentsService(
        analyticsService,
        pluginCollection,
        documentsExpirationService,
        documentStorageService,
        passportService,
        taxpayerCardService,
        userService,
        documentsDataMapper,
        appUtils,
        identifier,
        envService,
        logger,
        task,
    )
    const headers = testKit.session.getHeaders()
    const session = testKit.session.getUserSession()

    describe(`method: getDocumentsFilterForSession`, () => {
        it('should throw BadRequestError if given unsupported session type', () => {
            const notValidSession = <UserSession>(<unknown>{ ...session, sessionType: SessionType.Temporary })

            expect(() => service.getDocumentsFilterForSession(notValidSession)).toThrow(new BadRequestError('Unsupported session type'))
        })

        it('should return user session type filter', () => {
            const extendedSession = {
                ...session,
                features: {
                    [<ProfileFeature>'profile-feature']: {
                        profileId: randomUUID(),
                    },
                },
            }

            const filter = [...service.documentFilters, <DocumentType>'document-type-8', <DocumentType>'document-type-9']

            expect(service.getDocumentsFilterForSession(extendedSession)).toMatchObject(filter)
        })
    })

    describe(`method: validateUser`, () => {
        it('should return undefined if session type is not user', () => {
            const acquirerUser = <AppUser>(<unknown>{ ...session.user, sessionType: SessionType.Acquirer })

            expect(service.validateUser(acquirerUser)).toBeUndefined()
        })

        it('should throw AccessDeniedError if itn format is not valid', () => {
            const { user } = session

            user.itn = 'wrong-itn'

            expect(() => service.validateUser(user)).toThrow(new AccessDeniedError('User has invalid data in token'))
            expect(logger.error).toHaveBeenCalledWith(`User has invalid itn [${user.itn}] in token`)
        })
    })

    describe(`method: getDocumentsToProcess`, () => {
        it('should return empty data array if received unexpected document type', async () => {
            const wrongDocumentType = <DocumentType>'wrong-type'

            const result = { [wrongDocumentType]: { data: [], status: HttpStatusCode.BAD_REQUEST, unavailableData: undefined } }

            expect(await service.getDocumentsToProcess(session.user, headers, [wrongDocumentType], {}, true)).toMatchObject(result)
        })
    })

    describe(`method: getDocumentsToProcessByItn`, () => {
        it('should return empty data array if received unexpected document type', async () => {
            const wrongDocumentType = <DocumentType>'wrong-type'

            const result = { [wrongDocumentType]: { data: [], status: 400, unavailableData: undefined } }

            expect(await service.getDocumentsToProcessByItn(session.user.itn, [wrongDocumentType], true)).toMatchObject(result)
        })
    })

    describe(`method: getDocumentsToProcessV1`, () => {
        it('should return internal passport', async () => {
            const mockDocumentsFilter: DocumentType[] = [DocumentType.InternalPassport]
            const documentTypeResponse = DocumentTypeResponse.IdCard

            const getInternalPassportResponse: GetDocumentsResult<InternalPassport> = {
                documents: [testKit.docs.getInternalPassport()],
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

            const card = testKit.docs.getTaxpayerCard()

            jest.spyOn(taxpayerCardService, 'getTaxpayerCard').mockResolvedValueOnce(card)

            expect(await service.getDocumentsToProcessV1(mockDocumentsFilter, session.user)).toMatchObject(result)
        })
    })

    describe(`method: getFilteredDocumentsOrder`, () => {
        it('should return documents order', async () => {
            const documentsOrder = [{ documentType: DocumentType.InternalPassport }]

            const result = [DocumentTypeResponse.IdCard]

            jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(documentsOrder)

            expect(await service.getFilteredDocumentsOrder(session.user.identifier)).toMatchObject(result)
        })
    })

    describe(`method: getIdentityDocument`, () => {
        it('should return undefined if not found passport', async () => {
            const documents = { hasDocuments: true, missingDocumnets: [] }

            jest.spyOn(userService, 'hasDocuments').mockResolvedValueOnce(documents)
            jest.spyOn(passportService, 'getIdentityDocument').mockResolvedValueOnce(undefined)

            expect(await service.getIdentityDocument(session.user)).toBeUndefined()
        })

        it('should return identity passport', async () => {
            const documents = { hasDocuments: true, missingDocumnets: [] }

            jest.spyOn(userService, 'hasDocuments').mockResolvedValueOnce(documents)

            const passport = testKit.docs.getInternalPassport()
            const result = { ...passport, identityType: DocumentType.InternalPassport }

            jest.spyOn(passportService, 'getIdentityDocument').mockResolvedValueOnce(result)

            expect(await service.getIdentityDocument(session.user)).toMatchObject(result)
        })
    })

    describe(`method: handleDocumentsPhoto`, () => {
        it('should return undefined if checked points are empty', async () => {
            expect(
                await service.handleDocumentsPhoto(session.user.identifier, <DocumentType>'document-type', [], undefined),
            ).toBeUndefined()
        })

        it('should successfully handle documents photo', async () => {
            const mockCheckedPoints: DocumentsFeaturePointsExistence = {
                [DocumentType.InternalPassport]: new Set(['point1', 'point2']),
            }

            const passport = testKit.docs.getInternalPassport()

            jest.spyOn(appUtils, 'getDocumentPhoto').mockReturnValueOnce(passport.photo)
            jest.spyOn(identifier, 'createIdentifier').mockReturnValueOnce('identifier')
            jest.spyOn(userService, 'saveDocumentPhoto').mockResolvedValueOnce(undefined)
            jest.spyOn(userService, 'removeDocumentPhoto').mockResolvedValueOnce(undefined)

            const result = await service.handleDocumentsPhoto(
                session.user.identifier,
                DocumentType.InternalPassport,
                [passport],
                mockCheckedPoints,
            )

            expect(result).toBeUndefined()
        })
    })

    describe(`method: checkDocumentsFeaturePoints`, () => {
        it('should fail to check documents feature points', async () => {
            const err = new Error('failed to execute request')

            jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockRejectedValueOnce(err)

            expect(await service.checkDocumentsFeaturePoints(session.user.identifier)).toBeUndefined()
            expect(logger.fatal).toHaveBeenCalledWith('Failed to check documents feature points', { err })
        })
    })

    describe(`method: hasDocumentInRegistry`, () => {
        it('should return false if document not found', async () => {
            const documentTypeResponse = <DocumentTypeResponse>'document-type-1'
            const documentsToProcess = {
                [documentTypeResponse]: {
                    status: HttpStatusCode.OK,
                    data: [],
                },
            }

            jest.spyOn(service, 'getDocumentsToProcessV1').mockResolvedValueOnce(documentsToProcess)

            expect(await service.hasDocumentInRegistry(<DocumentType>'document-type-2', session.user)).toBeFalsy()
        })
    })

    describe(`method: syncDocumentDataInStorage`, () => {
        it('should return undefined if international vaccination certificate document given', async () => {
            expect(
                await service.syncDocumentDataInStorage(session.user.identifier, DocumentType.InternationalVaccinationCertificate, [], []),
            ).toBeUndefined()
        })

        it('should return undefined if unsupported document type given', async () => {
            const unsupportedDocumentType = <DocumentType>'unsupportedDocumentType'

            expect(await service.syncDocumentDataInStorage(session.user.identifier, unsupportedDocumentType, [], [])).toBeUndefined()
            expect(logger.log).toHaveBeenCalledWith('No need to store data for this document type', {
                documentType: unsupportedDocumentType,
            })
        })
    })

    describe(`method: saveDocumentsInUserProfile`, () => {
        it('should return undefined if taxpayer card given', async () => {
            jest.spyOn(envService, 'isProd').mockReturnValueOnce(true)

            const doc = testKit.docs.getTaxpayerCard({ docStatus: DocStatus.Deleting })

            const result = await service.saveDocumentsInUserProfile(session.user.identifier, DocumentType.TaxpayerCard, [doc], headers)

            expect(result).toBeUndefined()
        })

        it('should successfully save documents if not taxpayer card', async () => {
            const doc = testKit.docs.getInternalPassport()

            const profileDocument: UserProfileDocument = {
                documentIdentifier: 'firstIdentifier',
                ownerType: OwnerType.properUser,
                docId: doc.id,
                docStatus: doc.docStatus,
                registrationDate: doc.registrationDate,
                normalizedDocumentIdentifier: 'secondIdentifier',
            }

            const message: UserProfileAddDocumentsMessage = {
                userIdentifier: session.user.identifier,
                documentType: DocumentType.InternalPassport,
                documents: [profileDocument],
                headers,
                removeMissingDocuments: true,
            }

            jest.spyOn(userService, 'saveDocumentsInUserProfile').mockResolvedValueOnce(undefined)
            jest.spyOn(documentsDataMapper, 'toUserProfileDocument').mockReturnValueOnce(profileDocument)

            const result = await service.saveDocumentsInUserProfile(session.user.identifier, DocumentType.InternalPassport, [doc], headers)

            expect(result).toBeUndefined()
            expect(userService.saveDocumentsInUserProfile).toHaveBeenCalledWith(message)
        })
    })

    describe(`method: getDocument`, () => {
        it('should throw error if unexpected document type given', async () => {
            const params = {
                documentType: <DocumentType>'wrong-type',
                documentId: 'documentId',
                user: session.user,
                headers,
                designSystem: false,
            }

            await expect(service.getDocument(params)).rejects.toThrow(new Error(`Unexpected getDocumentType: ${params.documentType}`))
        })
    })

    describe(`method: getDocuments`, () => {
        it('should return passport', async () => {
            const filter = [DocumentType.InternalPassport]
            const outputParams = { designSystem: false }

            jest.spyOn(envService, 'isStage').mockReturnValueOnce(true)

            const model = <DocumentsExpirationModel>{
                mobileUid: headers.mobileUid,
                userIdentifier: session.user.identifier,
            }

            const document = testKit.docs.getInternalPassport()
            const featurePoints = { documents: [{ documentType: DocumentType.InternalPassport, documentIdentifier: randomUUID() }] }

            const mockCheckedPoints: DocumentsFeaturePointsExistence = {
                [DocumentType.InternalPassport]: new Set([featurePoints.documents[0].documentIdentifier]),
            }

            const decryptedData = {
                [DocumentType.InternalPassport]: [{ id: document.id }],
            }

            jest.spyOn(service, 'validateUser').mockReturnValueOnce()
            jest.spyOn(documentsExpirationService, 'getDocumentsExpiration').mockResolvedValueOnce(model)
            jest.spyOn(service, 'checkDocumentsFeaturePoints').mockResolvedValueOnce(mockCheckedPoints)
            jest.spyOn(userService, 'getDecryptedDataFromStorage').mockResolvedValueOnce(decryptedData)

            const getPassportDocumentsResponse: GetDocumentsResult<InternalPassport> = {
                documents: [document],
                designSystemDocuments: [],
                unavailableDocuments: [],
                statusCode: HttpStatusCode.OK,
            }

            jest.spyOn(passportService, 'getInternalPassportDocuments').mockResolvedValueOnce(getPassportDocumentsResponse)

            jest.spyOn(analyticsService, 'logDocumentAnalytics').mockReturnValueOnce()

            jest.spyOn(documentsExpirationService, 'collectDocumentExpirationModifier').mockResolvedValueOnce({ expirationTime: 1000 })

            const decryptedDataFromStorage = [{ id: document.id }]

            jest.spyOn(appUtils, 'getStorageDataByDocumentTypes').mockReturnValueOnce(decryptedDataFromStorage)

            jest.spyOn(service, 'saveDocumentsInUserProfile').mockResolvedValueOnce()
            jest.spyOn(service, 'syncDocumentDataInStorage').mockResolvedValueOnce()
            jest.spyOn(service, 'handleDocumentsPhoto').mockResolvedValueOnce()

            const documentsOrder = [
                {
                    documentType: DocumentType.InternalPassport,
                },
            ]

            jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(documentsOrder)
            jest.spyOn(documentsExpirationService, 'performDocumentsExpirationUpdate').mockResolvedValueOnce()
            jest.spyOn(task, 'publish').mockResolvedValueOnce(true)

            // Act
            const result = await service.getDocuments(session, filter, headers, outputParams)

            // Assert
            expect(result).toMatchObject({
                idCard: {
                    data: getPassportDocumentsResponse.documents,
                    status: HttpStatusCode.OK,
                    unavailableData: [],
                },
                documentsTypeOrder: [DocumentTypeResponse.IdCard],
            })
        })
    })
})
