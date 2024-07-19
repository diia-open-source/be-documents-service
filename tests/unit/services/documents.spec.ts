import { randomUUID } from 'node:crypto'

import { IdentifierService } from '@diia-inhouse/crypto'
import Logger from '@diia-inhouse/diia-logger'
import { Task } from '@diia-inhouse/diia-queue'
import { EnvService } from '@diia-inhouse/env'
import { AccessDeniedError, BadRequestError, InternalServerError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { AppUser, HttpStatusCode, OwnerType, ProfileFeature, SessionType, UserSession } from '@diia-inhouse/types'
import { DocumentOrderSettingsItem } from '@diia-inhouse/user-service-client'

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

import { DocumentsExpirationModel } from '@interfaces/models/documentsExpiration'
import { InternalPassportInstance } from '@interfaces/providers/eis'
import { DocumentsFeaturePointsExistence } from '@interfaces/services/documents'
import { PassportDocumentType, PassportDocumentTypeCamelCase } from '@interfaces/services/passport'
import { UserProfileAddDocumentsMessage, UserProfileDocument } from '@interfaces/services/user'

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

            const filter = [...service.documentFilters, 'document-type-8', 'document-type-9']

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
            const wrongDocumentType = 'wrong-type'

            const result = { [wrongDocumentType]: { data: [], status: HttpStatusCode.BAD_REQUEST, unavailableData: undefined } }

            expect(await service.getDocumentsToProcess(session.user, headers, [wrongDocumentType], {}, true)).toMatchObject(result)
        })
    })

    describe(`method: getDocumentsToProcessByItn`, () => {
        it('should return empty data array if received unexpected document type', async () => {
            const wrongDocumentType = 'wrong-type'

            const result = { [wrongDocumentType]: { data: [], status: 400, unavailableData: undefined } }

            expect(await service.getDocumentsToProcessByItn(session.user.itn, [wrongDocumentType], true)).toMatchObject(result)
        })
    })

    describe(`method: getFilteredDocumentsOrder`, () => {
        it('should return documents order', async () => {
            const documentsOrder: DocumentOrderSettingsItem[] = [
                { documentType: PassportDocumentType.InternalPassport, documentIdentifiers: [] },
            ]

            const result = [PassportDocumentTypeCamelCase.IdCard]

            jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
                documentOrderSettings: documentsOrder,
                documentVisibilitySettings: [],
            })

            expect(await service.getFilteredDocumentsOrder(session.user.identifier)).toMatchObject(result)
        })
    })

    describe(`method: getIdentityDocument`, () => {
        it('should return undefined if not found passport', async () => {
            const undefinedIdentityDocument = undefined
            const documents = { hasDocuments: true, missingDocumnets: [] }

            jest.spyOn(userService, 'hasDocuments').mockResolvedValueOnce(documents)
            jest.spyOn(passportService, 'getIdentityDocument').mockResolvedValueOnce(undefinedIdentityDocument)

            expect(await service.getIdentityDocument(session.user)).toBeUndefined()
        })

        it('should return identity passport', async () => {
            const documents = { hasDocuments: true, missingDocumnets: [] }

            jest.spyOn(userService, 'hasDocuments').mockResolvedValueOnce(documents)

            const passport = <InternalPassportInstance>testKit.docs.generateDocument(PassportDocumentType.InternalPassport)
            const result = { ...passport, identityType: PassportDocumentType.InternalPassport }

            jest.spyOn(passportService, 'getIdentityDocument').mockResolvedValueOnce(result)

            expect(await service.getIdentityDocument(session.user)).toMatchObject(result)
        })
    })

    describe(`method: handleDocumentsPhoto`, () => {
        it('should return undefined if checked points are empty', async () => {
            const undefinedCheckPoints = undefined

            expect(await service.handleDocumentsPhoto(session.user.identifier, 'document-type', [], undefinedCheckPoints)).toBeUndefined()
        })

        it('should successfully handle documents photo', async () => {
            const mockCheckedPoints: DocumentsFeaturePointsExistence = {
                [PassportDocumentType.InternalPassport]: new Set(['point1', 'point2']),
            }

            const passport = <InternalPassportInstance>testKit.docs.generateDocument(PassportDocumentType.InternalPassport)

            jest.spyOn(appUtils, 'getDocumentPhoto').mockReturnValueOnce(passport.photo)
            jest.spyOn(identifier, 'createIdentifier').mockReturnValueOnce('identifier')
            jest.spyOn(userService, 'saveDocumentPhoto').mockResolvedValueOnce()
            jest.spyOn(userService, 'removeDocumentPhoto').mockResolvedValueOnce()

            const result = await service.handleDocumentsPhoto(
                session.user.identifier,
                PassportDocumentType.InternalPassport,
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
            const documentTypeResponse = 'documentType1'
            const documentsToProcess = {
                [documentTypeResponse]: {
                    status: HttpStatusCode.OK,
                    data: [],
                },
            }

            jest.spyOn(service, 'getDocumentsToProcessV1').mockResolvedValueOnce(documentsToProcess)

            expect(await service.hasDocumentInRegistry('document-type-2', session.user)).toBeFalsy()
        })
    })

    describe(`method: syncDocumentDataInStorage`, () => {
        it('should return undefined if unsupported document type given', async () => {
            const unsupportedDocumentType = 'unsupportedDocumentType'

            expect(await service.syncDocumentDataInStorage(session.user.identifier, unsupportedDocumentType, [], [])).toBeUndefined()
            expect(logger.log).toHaveBeenCalledWith('No need to store data for this document type', {
                documentType: unsupportedDocumentType,
            })
        })
    })

    describe(`method: saveDocumentsInUserProfile`, () => {
        it('should successfully save documents if not taxpayer card', async () => {
            const doc = <InternalPassportInstance>testKit.docs.generateDocument(PassportDocumentType.InternalPassport)

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
                documentType: PassportDocumentType.InternalPassport,
                documents: [profileDocument],
                headers,
                removeMissingDocuments: true,
            }

            jest.spyOn(userService, 'saveDocumentsInUserProfile').mockResolvedValueOnce()
            jest.spyOn(documentsDataMapper, 'toUserProfileDocument').mockReturnValueOnce(profileDocument)

            const result = await service.saveDocumentsInUserProfile(
                session.user.identifier,
                PassportDocumentType.InternalPassport,
                [doc],
                headers,
            )

            expect(result).toBeUndefined()
            expect(userService.saveDocumentsInUserProfile).toHaveBeenCalledWith(message)
        })
    })

    describe(`method: getDocument`, () => {
        it('should throw error if unexpected document type given', async () => {
            const params = {
                documentType: 'wrong-type',
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
            const filter = [PassportDocumentType.InternalPassport]
            const outputParams = { designSystem: false }

            jest.spyOn(envService, 'isStage').mockReturnValueOnce(true)

            const model = <DocumentsExpirationModel>{
                mobileUid: headers.mobileUid,
                userIdentifier: session.user.identifier,
            }

            const document = <InternalPassportInstance>testKit.docs.generateDocument(PassportDocumentType.InternalPassport)
            const featurePoints = { documents: [{ documentType: PassportDocumentType.InternalPassport, documentIdentifier: randomUUID() }] }

            const mockCheckedPoints: DocumentsFeaturePointsExistence = {
                [PassportDocumentType.InternalPassport]: new Set([featurePoints.documents[0].documentIdentifier]),
            }

            const decryptedData = {
                [PassportDocumentType.InternalPassport]: [{ id: document.id }],
            }

            jest.spyOn(service, 'validateUser').mockReturnValueOnce()
            jest.spyOn(documentsExpirationService, 'getDocumentsExpiration').mockResolvedValueOnce(model)
            jest.spyOn(service, 'checkDocumentsFeaturePoints').mockResolvedValueOnce(mockCheckedPoints)
            jest.spyOn(userService, 'getDecryptedDataFromStorage').mockResolvedValueOnce(decryptedData)

            const getPassportDocumentsResponse = {
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

            const documentsOrder: DocumentOrderSettingsItem[] = [
                {
                    documentType: PassportDocumentType.InternalPassport,
                    documentIdentifiers: [],
                },
            ]

            jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
                documentOrderSettings: documentsOrder,
                documentVisibilitySettings: [],
            })
            jest.spyOn(userDocumentSettingsService, 'filterDocuments').mockReturnValueOnce([document])
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
                documentsTypeOrder: [PassportDocumentTypeCamelCase.IdCard],
            })
        })
    })

    describe(`method: getSortedByDefaultDocumentTypes`, () => {
        it('should successfully compose and return sorted by default documents types', () => {
            const someSessionType = <SessionType>'some-session-type'
            const defaultDocumentService = getDocumentService()
            const serviceWithSortedByDefaultDocumentTypes = new DocumentsService(
                analyticsService,
                [
                    defaultDocumentService,
                    {
                        ...defaultDocumentService,
                        sessionType: someSessionType,
                        defaultSortOrder: { ['document-type3']: 200, ['document-type4']: 210 },
                    },
                    {
                        ...defaultDocumentService,
                        sessionType: someSessionType,
                        defaultSortOrder: { ['document-type5']: 220, ['document-type6']: 230 },
                    },
                ],
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

            serviceWithSortedByDefaultDocumentTypes.onRegistrationsFinished()

            const result = serviceWithSortedByDefaultDocumentTypes.getSortedByDefaultDocumentTypes()

            expect(result).toEqual({
                [SessionType.User]: {
                    items: ['document-type1', 'internal-passport', 'foreign-passport', 'document-type2'],
                },
                [someSessionType]: { items: ['document-type3', 'document-type4', 'document-type5', 'document-type6'] },
            })
        })

        it('should fail with error in case some of order number is duplicate for some document types', () => {
            expect(() => {
                const serviceWithDuplicatedOrder = new DocumentsService(
                    analyticsService,
                    [
                        getDocumentService({
                            defaultSortOrder: { ['document-type1']: 20, ['document-type2']: 20 },
                        }),
                    ],
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

                serviceWithDuplicatedOrder.onRegistrationsFinished()
            }).toThrow(
                new InternalServerError(`Order number is not unique for document-type2. 20 number already assigned to document-type1`),
            )
        })
    })

    describe(`method: getDocumentNames`, () => {
        it('should successfully return entire list of document names', () => {
            const result = service.getDocumentNames([])

            expect(result).toEqual({
                'document-type1': 'Document type 1 name',
                'document-type2': 'Document type 2 name',
                'foreign-passport': 'Закордонний паспорт',
                'internal-passport': 'Паспорт громадянина України',
            })
        })

        it('should successfully return filtered list of document names', () => {
            const result = service.getDocumentNames(['document-type2'])

            expect(result).toEqual({
                'document-type2': 'Document type 2 name',
            })
        })
    })

    describe(`method: getSharingRenderDataByDocumentType`, () => {
        const { user } = testKit.session.getUserSession()
        const { identifier: requester } = user
        const requestDateTime = new Date().toISOString()
        const requestIdentifier = randomUUID()

        it('should successfully call strategy method for valid document type', () => {
            const documentType = 'document-type'

            const result = service.getSharingRenderDataByDocumentType(documentType, {}, requester, requestDateTime, requestIdentifier)

            expect(result).toEqual(expect.any(Object))
        })

        it('should fail with error in case document type is not supported', () => {
            const documentType = 'unsupported-document-type'

            expect(() => {
                service.getSharingRenderDataByDocumentType(documentType, {}, requester, requestDateTime, requestIdentifier)
            }).toThrow(new Error(`Unknown scope ${documentType}`))
        })
    })
})
