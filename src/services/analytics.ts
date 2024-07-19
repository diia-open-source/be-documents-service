import moment from 'moment'

import { DocStatus, HttpStatusCode, Logger, OnRegistrationsFinished } from '@diia-inhouse/types'

import { AppConfig } from '@interfaces/config'
import {
    AnalyticsActionResult,
    AnalyticsActionType,
    DocumentAnalytics,
    DocumentAnalyticsCategory,
    DocumentAnalyticsParams,
} from '@interfaces/services'
import { CommonDocument, DocumentAnalyticsService, DocumentStatusCode } from '@interfaces/services/documents'
import { PassportDocumentType } from '@interfaces/services/passport'

export default class Analytics implements OnRegistrationsFinished {
    readonly getDocumentActionTypeByDocumentType: Record<string, AnalyticsActionType> = {
        [PassportDocumentType.InternalPassport]: AnalyticsActionType.GetIdCard,
        [PassportDocumentType.ForeignPassport]: AnalyticsActionType.GetForeignPassport,
    }

    readonly generateOtpActionTypeByDocumentType: Record<string, AnalyticsActionType | null> = {
        [PassportDocumentType.InternalPassport]: AnalyticsActionType.GenerateOtpIdCard,
        [PassportDocumentType.ForeignPassport]: AnalyticsActionType.GenerateOtpForeignPassport,
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
        private readonly documentAnalyticsServices: DocumentAnalyticsService[],
    ) {}

    onRegistrationsFinished(): void {
        for (const instance of this.documentAnalyticsServices) {
            const {
                documentTypeToGenerateOtpAnalyticsAction = {},
                documentTypeToGetDocumentAnalyticsAction = {},
                actionResultByStatusCode = {},
            } = instance

            Object.assign(this.generateOtpActionTypeByDocumentType, documentTypeToGenerateOtpAnalyticsAction)
            Object.assign(this.getDocumentActionTypeByDocumentType, documentTypeToGetDocumentAnalyticsAction)
            Object.assign(this.actionResultByStatusCode, actionResultByStatusCode)
        }
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
            // eslint-disable-next-line unicorn/consistent-destructuring
            subtype: 'docSubtype' in document ? document.docSubtype : undefined,
            expirationDate:
                // eslint-disable-next-line unicorn/consistent-destructuring
                expirationDate instanceof Date ? moment(document.expirationDate).format(this.config.app.dateFormat) : expirationDate,
        }
    }
}
