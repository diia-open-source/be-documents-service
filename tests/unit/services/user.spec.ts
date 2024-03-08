import { randomUUID } from 'crypto'

import { MoleculerService } from '@diia-inhouse/diia-app'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { EventBus, InternalEvent } from '@diia-inhouse/diia-queue'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { ActionVersion, DocStatus, DocumentType, OwnerType, ProfileFeature } from '@diia-inhouse/types'

import UserService from '@services/user'

import DocumentsDataMapper from '@dataMappers/documentsDataMapper'

import {
    DocumentFilter,
    UserDocumentsOrderParams,
    UserProfileAddDocumentPhotoMessage,
    UserProfileAddDocumentsMessage,
    UserProfileRemoveDocumentPhotoMessage,
} from '@interfaces/services/user'

describe(`Service ${UserService.name}`, () => {
    const testKit = new TestKit()
    const moleculerService = mockInstance(MoleculerService)
    const diiaLogger = mockInstance(DiiaLogger)
    const eventBus = mockInstance(EventBus)
    const documentsDataMapper = mockInstance(DocumentsDataMapper)
    const service = new UserService(moleculerService, diiaLogger, eventBus, documentsDataMapper)

    const { user } = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()
    const mobileUid = headers.mobileUid

    describe(`method: ${service.getDocumentsOrder.name}`, () => {
        it('should return documents order', async () => {
            const params: UserDocumentsOrderParams = {
                userIdentifier: user.identifier,
            }

            const result = [{ documentType: <DocumentType>'document-type-1' }, { documentType: <DocumentType>'document-type-2' }]

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(result)

            expect(await service.getDocumentsOrder(params)).toMatchObject(result)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'getDocumentsOrder', actionVersion: ActionVersion.V1 },
                { params: params },
            )
        })
    })

    describe(`method: ${service.addDocumentInStorage.name}`, () => {
        it('should successfully add document in storage', async () => {
            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(undefined)

            expect(
                await service.addDocumentInStorage(user.identifier, DocumentType.ForeignPassport, 'hashData', 'encryptedData', mobileUid),
            ).toBeUndefined()
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'addDocumentInStorage', actionVersion: ActionVersion.V1 },
                {
                    params: {
                        userIdentifier: user.identifier,
                        documentType: DocumentType.ForeignPassport,
                        hashData: 'hashData',
                        encryptedData: 'encryptedData',
                        mobileUid,
                    },
                },
            )
        })
    })

    describe(`method: ${service.getEncryptedDataFromStorage.name}`, () => {
        it('should successfully return encrypted data', async () => {
            const params = {
                userIdentifier: user.identifier,
            }

            const result = {
                [DocumentType.InternalPassport]: ['data'],
            }

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(result)

            expect(await service.getEncryptedDataFromStorage(params)).toMatchObject(result)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'getEncryptedDataFromStorage', actionVersion: ActionVersion.V1 },
                {
                    params,
                },
            )
        })
    })

    describe(`method: ${service.getDecryptedDataFromStorage.name}`, () => {
        it('should successfully return decrypted data', async () => {
            const params = {
                userIdentifier: user.identifier,
            }

            const result = {
                [DocumentType.InternalPassport]: {
                    id: 'id',
                    licensePlate: 'licensePlate',
                    vin: 'vin',
                },
            }

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(result)

            expect(await service.getDecryptedDataFromStorage(params)).toMatchObject(result)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'getDecryptedDataFromStorage', actionVersion: ActionVersion.V1 },
                {
                    params,
                },
            )
        })
    })

    describe(`method: ${service.removeFromStorageByHashData.name}`, () => {
        it('should successfully remove from storage by hash data', async () => {
            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(undefined)

            expect(await service.removeFromStorageByHashData(user.identifier, DocumentType.ForeignPassport, 'hashData')).toBeUndefined()
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'removeFromStorageByHashData', actionVersion: ActionVersion.V1 },
                {
                    params: {
                        userIdentifier: user.identifier,
                        documentType: DocumentType.ForeignPassport,
                        hashData: 'hashData',
                    },
                },
            )
        })
    })

    describe(`method: ${service.hasOneOfDocuments.name}`, () => {
        it('should return true if has one of given documents', async () => {
            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(true)

            expect(await service.hasOneOfDocuments(user.identifier, [DocumentType.ForeignPassport])).toBeTruthy()
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'hasOneOfDocuments', actionVersion: ActionVersion.V1 },
                {
                    params: {
                        userIdentifier: user.identifier,
                        documentTypes: [DocumentType.ForeignPassport],
                    },
                },
            )
        })
    })
    describe(`method: ${service.hasActionAccess.name}`, () => {
        it('should return true if has one of given documents', async () => {
            const actionAccessType = 'action-access-type'

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(true)

            expect(await service.hasActionAccess(user.identifier, actionAccessType)).toBeTruthy()
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'hasActionAccess', actionVersion: ActionVersion.V1 },
                {
                    params: {
                        userIdentifier: user.identifier,
                        actionAccessType,
                    },
                },
            )
        })
    })

    describe(`method: ${service.increaseCounterActionAccess.name}`, () => {
        it('should successfully increase counter action access', async () => {
            const actionAccessType = 'action-access-type'

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(undefined)

            expect(await service.increaseCounterActionAccess(user.identifier, actionAccessType)).toBeUndefined()
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'increaseCounterActionAccess', actionVersion: ActionVersion.V1 },
                {
                    params: {
                        userIdentifier: user.identifier,
                        actionAccessType,
                    },
                },
            )
        })
    })

    describe(`method: ${service.nullifyCounterActionAccess.name}`, () => {
        it('should successfully nullify counter action access', async () => {
            const actionAccessType = 'action-access-type'

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(undefined)

            expect(await service.nullifyCounterActionAccess(user.identifier, actionAccessType)).toBeUndefined()
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'nullifyCounterActionAccess', actionVersion: ActionVersion.V1 },
                {
                    params: {
                        userIdentifier: user.identifier,
                        actionAccessType,
                    },
                },
            )
        })
    })

    describe(`method: ${service.checkDocumentsFeaturePoints.name}`, () => {
        it('should return check documents feature points result', async () => {
            const documents = [{ documentType: <DocumentType>'document-type', documentIdentifier: 'documentIdentifier' }]

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(documents)

            expect(await service.checkDocumentsFeaturePoints(user.identifier)).toMatchObject(documents)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'checkDocumentsFeaturePoints', actionVersion: ActionVersion.V1 },
                {
                    params: {
                        userIdentifier: user.identifier,
                    },
                },
            )
        })
    })

    describe(`method: ${service.hasDocuments.name}`, () => {
        it('should return check documents result', async () => {
            const filters: DocumentFilter[][] = [
                [
                    {
                        documentType: <DocumentType>'document-type-1',
                        ownerType: OwnerType.owner,
                        docId: '123',
                        docStatus: [DocStatus.Ok],
                    },
                    {
                        documentType: <DocumentType>'document-type-2',
                        ownerType: OwnerType.owner,
                        docId: '456',
                        docStatus: [DocStatus.Ok],
                    },
                ],
            ]

            const result = {
                hasDocuments: true,
                missingDocumnets: [],
            }

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(result)

            expect(await service.hasDocuments(user.identifier, filters)).toMatchObject(result)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'hasDocuments', actionVersion: ActionVersion.V4 },
                {
                    params: {
                        userIdentifier: user.identifier,
                        filters,
                    },
                },
            )
        })
    })

    describe(`method: ${service.getUserDocumentsV1.name}`, () => {
        it('should return user documents', async () => {
            const params = {
                userIdentifier: user.identifier,
            }

            const result = {
                documents: [
                    { documentType: <DocumentType>'document-type', documentIdentifier: 'documentIdentifier', ownerType: OwnerType.owner },
                ],
            }

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(result)

            expect(await service.getUserDocumentsV1(params)).toMatchObject(result)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'getUserDocuments', actionVersion: ActionVersion.V1 },
                {
                    params,
                },
            )
        })
    })

    describe(`method: ${service.getUserDocuments.name}`, () => {
        it('should return user documents by filters', async () => {
            const filters: DocumentFilter[] = [
                {
                    documentType: <DocumentType>'document-type',
                    ownerType: OwnerType.owner,
                    docId: '123',
                    docStatus: [DocStatus.Ok],
                },
            ]

            const result = {
                documents: [
                    { documentType: <DocumentType>'document-type', documentIdentifier: 'documentIdentifier', ownerType: OwnerType.owner },
                ],
            }

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(result)

            expect(await service.getUserDocuments(user.identifier, filters)).toMatchObject(result)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'getUserDocuments', actionVersion: ActionVersion.V2 },
                {
                    params: { userIdentifier: user.identifier, filters },
                },
            )
        })
    })

    describe(`method: ${service.removeUserDocumentById.name}`, () => {
        it('should successfully remove user document by id', async () => {
            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(undefined)

            const result = await service.removeUserDocumentById(user.identifier, 'documentType', 'documentId', headers.mobileUid)

            expect(result).toBeUndefined()
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'removeUserDocumentById', actionVersion: ActionVersion.V1 },
                {
                    params: {
                        userIdentifier: user.identifier,
                        documentType: 'documentType',
                        documentId: 'documentId',
                        mobileUid: headers.mobileUid,
                    },
                },
            )
        })
    })

    describe(`method: ${service.hasStorageDocument.name}`, () => {
        it('should return true if has storage document', async () => {
            const params = {
                userIdentifier: user.identifier,
                mobileUid,
                documentType: DocumentType.ForeignPassport,
                id: 'id',
            }

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(true)

            expect(await service.hasStorageDocument(params)).toBeTruthy()
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'hasStorageDocument', actionVersion: ActionVersion.V1 },
                {
                    params,
                },
            )
        })
    })

    describe(`method: ${service.processUserDocuments.name}`, () => {
        it('should successfully process user documents', async () => {
            const params = {
                userIdentifier: user.identifier,
                documentTypes: [<DocumentType>'document-type-1'],
            }

            const result = [[<DocumentType>'document-type-1', <DocumentType>'document-type-2']]

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(result)

            expect(await service.processUserDocuments(params)).toMatchObject(result)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'processUserDocuments', actionVersion: ActionVersion.V1 },
                {
                    params,
                },
            )
        })
    })

    describe(`method: ${service.getUserProfileFeature.name}`, () => {
        it('should return user profile feature', async () => {
            const result = { [<ProfileFeature>'profile-feature']: { id: randomUUID() } }

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(result)

            expect(await service.getUserProfileFeature(user.identifier, <ProfileFeature>'profile-feature')).toMatchObject(result)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'User',
                { name: 'getUserProfileFeatures', actionVersion: ActionVersion.V1 },
                {
                    params: {
                        userIdentifier: user.identifier,
                        features: [<ProfileFeature>'profile-feature'],
                    },
                },
            )
        })
    })

    describe(`method: ${service.saveDocumentInUserProfile.name}`, () => {
        it('should return undefined if nothing to send to update', async () => {
            const result = await service.saveDocumentInUserProfile(user.identifier, <DocumentType>'document-type', undefined, headers)

            expect(result).toBeUndefined()
            expect(diiaLogger.debug).toHaveBeenCalledWith('Nothing to send to update user document', {
                documentType: <DocumentType>'document-type',
            })
        })

        it('should successfully send to update document in user profile', async () => {
            const document = {
                id: '1',
                docStatus: DocStatus.Ok,
                docNumber: '1',
            }

            jest.spyOn(documentsDataMapper, 'toUserProfileDocument').mockReturnValueOnce({
                docId: document.id,
                docStatus: document.docStatus,
                documentIdentifier: '123',
                ownerType: OwnerType.owner,
            })
            jest.spyOn(eventBus, 'publish').mockResolvedValueOnce(true)

            const result = await service.saveDocumentInUserProfile(user.identifier, <DocumentType>'document-type', document, headers)

            expect(result).toBeUndefined()
        })

        it('should fail to send to update document in user profile', async () => {
            const err = new Error('error')

            const document = {
                id: '1',
                docStatus: DocStatus.Ok,
                docNumber: '1',
            }

            jest.spyOn(documentsDataMapper, 'toUserProfileDocument').mockReturnValueOnce({
                docId: document.id,
                docStatus: document.docStatus,
                documentIdentifier: '123',
                ownerType: OwnerType.owner,
            })
            jest.spyOn(eventBus, 'publish').mockRejectedValueOnce(err)

            const result = await service.saveDocumentInUserProfile(user.identifier, <DocumentType>'document-type', document, headers)

            expect(result).toBeUndefined()
            expect(diiaLogger.fatal).toHaveBeenCalledWith('Failed to send update about document to user profile', {
                err,
                documentType: <DocumentType>'document-type',
            })
        })
    })

    describe(`method: ${service.saveDocumentsInUserProfile.name}`, () => {
        it('should successfully send to update document in user profile', async () => {
            const message: UserProfileAddDocumentsMessage = {
                userIdentifier: user.identifier,
                documentType: <DocumentType>'document-type',
                documents: [],
                headers,
                removeMissingDocuments: true,
            }

            jest.spyOn(eventBus, 'publish').mockResolvedValueOnce(true)

            const result = await service.saveDocumentsInUserProfile(message)

            expect(result).toBeUndefined()
            expect(eventBus.publish).toHaveBeenCalledWith(InternalEvent.DocumentsAddDocumentsInProfile, message)
        })
    })

    describe(`method: ${service.saveDocumentPhoto.name}`, () => {
        it('should successfully save document photo', async () => {
            const message: UserProfileAddDocumentPhotoMessage = {
                userIdentifier: user.identifier,
                documentType: DocumentType.InternalPassport,
                documentIdentifier: '123',
                photo: 'photo',
            }

            jest.spyOn(eventBus, 'publish').mockResolvedValueOnce(true)

            const result = await service.saveDocumentPhoto(message)

            expect(result).toBeUndefined()
            expect(eventBus.publish).toHaveBeenCalledWith(InternalEvent.DocumentsAddDocumentPhoto, message)
        })
    })

    describe(`method: ${service.removeDocumentPhoto.name}`, () => {
        it('should successfully remove document photo', async () => {
            const message: UserProfileRemoveDocumentPhotoMessage = {
                userIdentifier: user.identifier,
                documentType: DocumentType.InternalPassport,
                documentIdentifier: '123',
            }

            jest.spyOn(eventBus, 'publish').mockResolvedValueOnce(true)

            const result = await service.removeDocumentPhoto(message)

            expect(result).toBeUndefined()
            expect(eventBus.publish).toHaveBeenCalledWith(InternalEvent.DocumentsRemoveDocumentPhoto, message)
        })
    })
})
