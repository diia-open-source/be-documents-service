import { DocumentType, Localization, TickerAtmAction } from '@diia-inhouse/types'

export type DocumentCoverAction = 'deleteDocument' | 'inLine' | 'toDriverAccount'

export interface DocumentCover {
    title: string
    text: string
    actionButton?: {
        name: string
        action: DocumentCoverAction
    }
}

export enum DocumentTickerCode {
    InsuranceActive = 'insuranceActive',
    InsuranceInactive = 'insuranceInactive',
    Valid = 'valid',
    ValidUntil = 'validUntil',
    ValidOnlyInUkraine = 'validOnlyInUkraine',
    OneDose = 'oneDose',
    ExpiredInUkraine = 'expiredInUkraine',
    SlavaUkraini = 'slavaUkraini',
    UpdatedAt = 'updatedAt',
    UpdatedAtEnUa = 'updatedAtEnUa',
}

export type DocumentTickerType = 'info' | 'warning'

export interface DocumentTicker {
    type: DocumentTickerType
    text: string
}

export enum DocumentTickerPlaceholder {
    ValidUntil = 'validUntil',
    UpdatedAt = 'updatedAt',
    CovidCertificateType = 'covidCertificateType',
    Name = 'name',
}

export interface DocumentTickerParams {
    code: DocumentTickerCode
    localization?: Localization
    documentType?: DocumentType
    templateParams?: Partial<Record<DocumentTickerPlaceholder, string>>
    action?: TickerAtmAction
}
