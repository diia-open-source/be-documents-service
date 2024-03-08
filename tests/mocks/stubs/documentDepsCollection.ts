import { randomUUID } from 'crypto'
import EventEmitter from 'events'

import { merge } from 'lodash'

import { DocumentType, Localization, ProfileFeature, SessionType } from '@diia-inhouse/types'

import { DocumentDataMapper, DocumentDesignSystemDataMapper } from '@interfaces/dataMappers'
import {
    DocumentAnalyticsService,
    DocumentAttributesService,
    DocumentExpirationService,
    DocumentService,
    GetDocumentsStrategy,
} from '@interfaces/services/documents'
import { AssertStrategy, VerificationStrategy } from '@interfaces/services/documentVerification'

export const getDocumentService = (data: Partial<DocumentService> = {}): DocumentService => {
    return merge(
        {
            assertDocumentIsValid: <AssertStrategy>(<unknown>jest.fn().mockResolvedValue(true)),
            documentTypeToDocumentTypeResponse: { [<DocumentType>'document-type']: 'documentType' },
            documentTypeResponseToDocumentType: { documentType: <DocumentType>'document-type' },
            documentTypes: [<DocumentType>'document-type'],
            getDocuments: <GetDocumentsStrategy>(<unknown>jest.fn().mockResolvedValue([])),
            getDocumentsToProcess: <GetDocumentsStrategy>(<unknown>jest.fn().mockResolvedValue([])),
            verifyDocument: <VerificationStrategy>(<unknown>jest.fn().mockResolvedValue({ id: randomUUID() })),
            documentFiltersBySessionTypeAndFeature: {
                [SessionType.User]: {
                    [<ProfileFeature>'profile-feature']: [<DocumentType>'document-type-8', <DocumentType>'document-type-9'],
                },
            },
        },
        data,
    )
}

export const getDocumentExpirationService = (data: Partial<DocumentExpirationService> = {}): DocumentExpirationService => {
    return merge({ documentsWithoutExpirationPerUser: [<DocumentType>'document-type'] }, data)
}

export const getDocumentAnalyticsService = (data: Partial<DocumentAnalyticsService> = {}): DocumentAnalyticsService => {
    return merge(
        {
            documentTypeToGenerateOtpAnalyticsAction: {},
            documentTypeToGetDocumentAnalyticsAction: {},
        },
        data,
    )
}

export const getDocumentAttributesService = (data: Partial<DocumentAttributesService> = {}): DocumentAttributesService => {
    return merge(
        {
            covers: {},
            documentTypesForPrefixedTrident: {},
            tickers: {},
            tickersV1: {
                [Localization.ENG]: {},
                [Localization.UA]: {},
            },
        },
        data,
    )
}

export const getDocumentDataMapper = (data: Partial<DocumentDataMapper> = {}): DocumentDataMapper => {
    return merge(
        {
            documentTypes: [],
            enrichUserProfileDocument: jest.fn(),
        },
        data,
    )
}

export const getDocumentDesignSystemDataMapper = (data: Partial<DocumentDesignSystemDataMapper> = {}): DocumentDesignSystemDataMapper => {
    return merge({ documentTypeToComponentDocumentName: {} }, data)
}

export default class PluginDepsCollectionMock<T> extends EventEmitter {
    constructor(readonly items: T[] = []) {
        super()
    }

    on(_event: 'newItems', callback: (items: T[]) => void): this {
        callback(this.items)

        return this
    }

    addItems(items: T[]): void {
        this.items.push(...items)
    }
}
