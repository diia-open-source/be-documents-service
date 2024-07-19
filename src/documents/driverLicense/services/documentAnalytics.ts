import { DocumentType } from '@src/documents/driverLicense/interfaces/services'
import { AnalyticsActionType } from '@src/documents/driverLicense/interfaces/services/analytics'

import { DocumentAnalyticsService } from '@interfaces/services/documents'

export default class DriverLicenseAnalyticsService implements DocumentAnalyticsService {
    readonly documentTypeToGenerateOtpAnalyticsAction: Partial<Record<DocumentType, AnalyticsActionType>> = {
        [DocumentType.DriverLicense]: AnalyticsActionType.GenerateOtpDriverLicense,
    }

    readonly documentTypeToGetDocumentAnalyticsAction: Partial<Record<DocumentType, AnalyticsActionType>> = {
        [DocumentType.DriverLicense]: AnalyticsActionType.GetDriverLicense,
    }
}
