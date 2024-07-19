import { AnalyticsCategory } from '@src/interfaces/services'

export type RegistrationSource = 'passport' | 'passportByInn'

export enum PassportDocumentType {
    InternalPassport = 'internal-passport',
    ForeignPassport = 'foreign-passport',
}

export enum PassportDocumentTypeCamelCase {
    IdCard = 'idCard',
    ForeignPassport = 'foreignPassport',
}

export interface EnrichDocumentPhotoParams {
    internalPassportFirst?: boolean
    analytics?: {
        category: AnalyticsCategory
        action: string
        data: Record<string, unknown>
    }
}
