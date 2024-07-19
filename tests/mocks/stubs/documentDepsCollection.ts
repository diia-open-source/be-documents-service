import { randomUUID } from 'node:crypto'

import { merge } from 'lodash'

import { Localization, ProfileFeature, SessionType } from '@diia-inhouse/types'

import { DocumentDataMapper } from '@interfaces/dataMappers'
import {
    AnyDocumentService,
    DocumentAnalyticsService,
    DocumentAttributesService,
    DocumentExpirationService,
    GetDocumentsStrategy,
    GetSharingRenderDataByDocumentTypeStrategy,
} from '@interfaces/services/documents'
import { AssertStrategy, VerificationStrategy } from '@interfaces/services/documentVerification'

export const getDocumentService = (data: Partial<AnyDocumentService> = {}): Partial<AnyDocumentService> => {
    return merge(
        {
            assertDocumentIsValid: <AssertStrategy>(<unknown>jest.fn().mockResolvedValue(true)),
            documentTypeToDocumentTypeResponse: { ['document-type']: 'documentType' },
            documentTypeResponseToDocumentType: { documentType: 'document-type' },
            defaultSortOrder: { ['document-type1']: 20, ['document-type2']: 180 },
            documentTypeToName: {
                ['document-type1']: 'Document type 1 name',
                ['document-type2']: 'Document type 2 name',
            },
            documentTypes: ['document-type'],
            getDocuments: <GetDocumentsStrategy>(<unknown>jest.fn().mockResolvedValue([])),
            getDocumentsToProcess: <GetDocumentsStrategy>(<unknown>jest.fn().mockResolvedValue([])),
            verifyDocument: <VerificationStrategy>(<unknown>jest.fn().mockResolvedValue({ id: randomUUID() })),
            getSharingRenderData: <GetSharingRenderDataByDocumentTypeStrategy>(() => ({})),
            documentFiltersBySessionTypeAndFeature: {
                [SessionType.User]: {
                    [<ProfileFeature>'profile-feature']: ['document-type-8', 'document-type-9'],
                },
            },
        },
        data,
    )
}

export const getDocumentExpirationService = (data: Partial<DocumentExpirationService> = {}): DocumentExpirationService => {
    return merge({ documentsWithoutExpirationPerUser: ['document-type'] }, data)
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

export const getDocumentDataMapper = (data: Partial<DocumentDataMapper<object, string>> = {}): DocumentDataMapper<object, string> => {
    return merge(
        {
            documentTypes: [],
            enrichUserProfileDocument: jest.fn(),
            toDocumentInstance: jest.fn(),
            toVerifyDocumentInstance: jest.fn(),
        },
        data,
    )
}
