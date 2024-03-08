import moment from 'moment'

import { PluginDepsCollection } from '@diia-inhouse/diia-app'

import { DocStatus, DocumentType, HttpStatusCode, Logger } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'
import {
    AnalyticsActionResult,
    AnalyticsActionType,
    DocumentAnalytics,
    DocumentAnalyticsCategory,
    DocumentAnalyticsParams,
} from '@interfaces/services'
import { CommonDocument, DocumentAnalyticsService, DocumentStatusCode } from '@interfaces/services/documents'

export default class Analytics {
    readonly getDocumentActionTypeByDocumentType: Partial<Record<DocumentType, AnalyticsActionType>> = {
        [DocumentType.InternalPassport]: AnalyticsActionType.GetIdCard,
        [DocumentType.ForeignPassport]: AnalyticsActionType.GetForeignPassport,
    }

    readonly generateOtpActionTypeByDocumentType: Partial<Record<DocumentType, AnalyticsActionType | null>> = {
        [DocumentType.InternalPassport]: AnalyticsActionType.GenerateOtpIdCard,
        [DocumentType.ForeignPassport]: AnalyticsActionType.GenerateOtpForeignPassport,
    }

    private readonly actionResultByDocStatus: Partial<Record<DocStatus, AnalyticsActionResult>> = {
        [DocStatus.Ok]: AnalyticsActionResult.Success,
        [DocStatus.OldModel]: AnalyticsActionResult.OldModel,
        [DocStatus.AdditionalVerification]: AnalyticsActionResult.NeedVerification,
        [DocStatus.NoPhoto]: AnalyticsActionResult.NoPhoto,
        [DocStatus.Confirming]: AnalyticsActionResult.Confirming,
        [DocStatus.NotConfirmed]: AnalyticsActionResult.NotConfirmed,
        [DocStatus.Inactive]: AnalyticsActionResult.Inactive,
    }

    private readonly actionResultByStatusCode: Partial<Record<DocumentStatusCode, AnalyticsActionResult>> = {
        [HttpStatusCode.OK]: AnalyticsActionResult.Success,
        [HttpStatusCode.NOT_FOUND]: AnalyticsActionResult.NotFound,
        [HttpStatusCode.FORBIDDEN]: AnalyticsActionResult.NotConfirmed,
    }

    constructor(
        private readonly logger: Logger,
        private readonly config: AppConfig,
        private readonly documentAnalyticsServices: PluginDepsCollection<DocumentAnalyticsService>,
    ) {
        this.loadPluginDeps(this.documentAnalyticsServices.items)
        this.documentAnalyticsServices.on('newItems', (instances) => this.loadPluginDeps(instances))
    }

    logDocumentAnalytics({
        documentType,
        document,
        userIdentifier,
        headers,
        statusCode,
        documentId,
        data,
        category = DocumentAnalyticsCategory.GetDocuments,
    }: DocumentAnalyticsParams): void {
        const { mobileUid, appVersion, platformType, platformVersion } = headers
        const analytics: DocumentAnalytics = {
            date: new Date().toISOString(),
            category,
            action: {
                type: this.getDocumentActionTypeByDocumentType[documentType] || AnalyticsActionType.GetDocument,
                result: this.getActionResult(document?.docStatus, statusCode),
            },
            identifier: userIdentifier,
            appVersion,
            device: {
                identifier: mobileUid,
                platform: {
                    type: platformType,
                    version: platformVersion,
                },
            },
        }

        if (document) {
            analytics.data = this.getDocumentAnalyticsData(document)
        } else if (documentId) {
            analytics.data = { documentId }
        } else if (data) {
            analytics.data = data
        }

        this.logger.info('Analytics', { analytics })
    }

    getActionResult(docStatus: DocStatus | undefined, statusCode: DocumentStatusCode | undefined): AnalyticsActionResult {
        return docStatus ? this.getActionResultByDocStatus(docStatus) : this.getActionResultByStatusCode(statusCode)
    }

    getActionResultByDocStatus(docStatus: DocStatus | undefined): AnalyticsActionResult {
        return (docStatus && this.actionResultByDocStatus[docStatus]) || AnalyticsActionResult.Error
    }

    getActionResultByStatusCode(statusCode: DocumentStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR): AnalyticsActionResult {
        return this.actionResultByStatusCode[statusCode] || AnalyticsActionResult.Error
    }

    private getDocumentAnalyticsData(document: CommonDocument): DocumentAnalytics['data'] {
        const { id, expirationDate } = document

        return {
            documentId: id,
            subtype: 'docSubtype' in document ? document.docSubtype : undefined,
            expirationDate:
                expirationDate instanceof Date ? moment(document.expirationDate).format(this.config.app.dateFormat) : expirationDate,
        }
    }

    private loadPluginDeps(instances: DocumentAnalyticsService[]): void {
        instances.forEach((instance) => {
            const {
                documentTypeToGenerateOtpAnalyticsAction = {},
                documentTypeToGetDocumentAnalyticsAction = {},
                actionResultByStatusCode = {},
            } = instance

            Object.assign(this.generateOtpActionTypeByDocumentType, documentTypeToGenerateOtpAnalyticsAction)
            Object.assign(this.getDocumentActionTypeByDocumentType, documentTypeToGetDocumentAnalyticsAction)
            Object.assign(this.actionResultByStatusCode, actionResultByStatusCode)
        })
    }
}
