import { DocumentType } from '@diia-inhouse/types'

import { AnalyticsActionType } from '@src/documents/taxpayerCard/interfaces/services/analytics'

import { DocumentAnalyticsService } from '@interfaces/services/documents'

export default class TaxpayerCardAnalyticsService implements DocumentAnalyticsService {
    readonly documentTypeToGetDocumentAnalyticsAction: Partial<Record<DocumentType, AnalyticsActionType>> = {
        [DocumentType.TaxpayerCard]: AnalyticsActionType.GetTaxpayerCard,
    }

    readonly documentTypeToGenerateOtpAnalyticsAction: Partial<Record<DocumentType, AnalyticsActionType>> = {
        [DocumentType.TaxpayerCard]: AnalyticsActionType.GenerateOtpTaxpayerCard,
    }
}
