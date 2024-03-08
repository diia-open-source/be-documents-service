import { MoleculerService } from '@diia-inhouse/diia-app'

import { EventBus, InternalEvent } from '@diia-inhouse/diia-queue'
import { ActionVersion, AppUserActionHeaders, DocumentType, Logger, ProfileFeature, UserFeatures } from '@diia-inhouse/types'

import DocumentsDataMapper from '@dataMappers/documentsDataMapper'

import { DocumentDecryptedDataByDocumentType } from '@interfaces/services/cryptData'
import { CommonDocument } from '@interfaces/services/documents'
import {
    CheckDocumentsFeaturePointsResult,
    DocumentFilter,
    EncryptedDataByDocumentType,
    GetDataFromStorageParams,
    GetUserDocumentsParams,
    GetUserDocumentsResult,
    HasDocumentsResult,
    HasStorageDocumentParams,
    ProcessUserDocumentsParams,
    UserDocumentsOrderParams,
    UserDocumentsOrderResponse,
    UserProfileAddDocumentMessage,
    UserProfileAddDocumentPhotoMessage,
    UserProfileAddDocumentsMessage,
    UserProfileRemoveDocumentPhotoMessage,
} from '@interfaces/services/user'

export default class UserService {
    private readonly serviceName = 'User'

    constructor(
        private readonly moleculer: MoleculerService,
        private readonly logger: Logger,
        private readonly eventBus: EventBus,

        private readonly documentsDataMapper: DocumentsDataMapper,
    ) {}

    async getDocumentsOrder(params: UserDocumentsOrderParams): Promise<UserDocumentsOrderResponse[]> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'getDocumentsOrder',
                actionVersion: ActionVersion.V1,
            },
            {
                params: params,
            },
        )
    }

    async addDocumentInStorage(
        userIdentifier: string,
        documentType: DocumentType,
        hashData: string | undefined,
        encryptedData: string,
        mobileUid?: string,
    ): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'addDocumentInStorage',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier, documentType, hashData, encryptedData, mobileUid },
            },
        )
    }

    async getEncryptedDataFromStorage(params: GetDataFromStorageParams): Promise<EncryptedDataByDocumentType> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'getEncryptedDataFromStorage',
                actionVersion: ActionVersion.V1,
            },
            {
                params,
            },
        )
    }

    async getDecryptedDataFromStorage(params: GetDataFromStorageParams): Promise<DocumentDecryptedDataByDocumentType> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'getDecryptedDataFromStorage',
                actionVersion: ActionVersion.V1,
            },
            {
                params,
            },
        )
    }

    async removeFromStorageByHashData(userIdentifier: string, documentType: DocumentType, hashData: string): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'removeFromStorageByHashData',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier, documentType, hashData },
            },
        )
    }

    async hasOneOfDocuments(userIdentifier: string, documentTypes: DocumentType[]): Promise<boolean> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'hasOneOfDocuments', actionVersion: ActionVersion.V1 },
            { params: { userIdentifier, documentTypes } },
        )
    }

    async hasActionAccess(userIdentifier: string, actionAccessType: string): Promise<boolean> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'hasActionAccess',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier, actionAccessType },
            },
        )
    }

    async increaseCounterActionAccess(userIdentifier: string, actionAccessType: string): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'increaseCounterActionAccess',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier, actionAccessType },
            },
        )
    }

    async nullifyCounterActionAccess(userIdentifier: string, actionAccessType: string): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'nullifyCounterActionAccess',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier, actionAccessType },
            },
        )
    }

    async checkDocumentsFeaturePoints(userIdentifier: string): Promise<CheckDocumentsFeaturePointsResult> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'checkDocumentsFeaturePoints',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier },
            },
        )
    }

    async hasDocuments(userIdentifier: string, filters: DocumentFilter[][]): Promise<HasDocumentsResult> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'hasDocuments', actionVersion: ActionVersion.V4 },
            { params: { userIdentifier, filters } },
        )
    }

    async getUserDocumentsV1(params: GetUserDocumentsParams): Promise<GetUserDocumentsResult> {
        return await this.moleculer.act(this.serviceName, { name: 'getUserDocuments', actionVersion: ActionVersion.V1 }, { params })
    }

    async getUserDocuments(userIdentifier: string, filters: DocumentFilter[]): Promise<GetUserDocumentsResult> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'getUserDocuments', actionVersion: ActionVersion.V2 },
            { params: { userIdentifier, filters } },
        )
    }

    async removeUserDocumentById(userIdentifier: string, documentType: string, documentId: string, mobileUid: string): Promise<void> {
        return await this.moleculer.act(
            this.serviceName,
            { name: 'removeUserDocumentById', actionVersion: ActionVersion.V1 },
            { params: { userIdentifier, documentType, documentId, mobileUid } },
        )
    }

    async hasStorageDocument(params: HasStorageDocumentParams): Promise<boolean> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'hasStorageDocument',
                actionVersion: ActionVersion.V1,
            },
            {
                params,
            },
        )
    }

    async processUserDocuments(params: ProcessUserDocumentsParams): Promise<[DocumentType, DocumentType][]> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'processUserDocuments',
                actionVersion: ActionVersion.V1,
            },
            {
                params,
            },
        )
    }

    async getUserProfileFeature(userIdentifier: string, feature: ProfileFeature): Promise<UserFeatures> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'getUserProfileFeatures',
                actionVersion: ActionVersion.V1,
            },
            {
                params: { userIdentifier, features: [feature] },
            },
        )
    }

    async saveDocumentInUserProfile(
        userIdentifier: string,
        documentType: DocumentType,
        document: CommonDocument | undefined,
        headers: AppUserActionHeaders,
    ): Promise<void> {
        if (!document) {
            this.logger.debug('Nothing to send to update user document', { documentType })

            return
        }

        const userProfileDocument = this.documentsDataMapper.toUserProfileDocument(documentType, document)

        const message: UserProfileAddDocumentMessage = {
            userIdentifier,
            documentType,
            headers,
            ...userProfileDocument,
        }

        try {
            await this.eventBus.publish(InternalEvent.DocumentsAddDocumentInProfile, message)
        } catch (err) {
            this.logger.fatal('Failed to send update about document to user profile', { err, documentType })
        }
    }

    async saveDocumentsInUserProfile(message: UserProfileAddDocumentsMessage): Promise<void> {
        await this.eventBus.publish(InternalEvent.DocumentsAddDocumentsInProfile, message)
    }

    async saveDocumentPhoto(message: UserProfileAddDocumentPhotoMessage): Promise<void> {
        await this.eventBus.publish(InternalEvent.DocumentsAddDocumentPhoto, message)
    }

    async removeDocumentPhoto(message: UserProfileRemoveDocumentPhotoMessage): Promise<void> {
        await this.eventBus.publish(InternalEvent.DocumentsRemoveDocumentPhoto, message)
    }
}
