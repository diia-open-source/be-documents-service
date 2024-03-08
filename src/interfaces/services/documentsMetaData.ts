import { DocStatus, OwnerType } from '@diia-inhouse/types'

import { DocumentTicker } from '@interfaces/services/documentAttributes'

export interface DocumentsMetaData {
    currentDate?: string
    expirationDate?: string
}

/** @deprecated please, migrate to types */
export interface DocumentMetaData {
    docStatus: DocStatus
    docNumber: string
    docSubtype?: string
    ownerType?: OwnerType
    registrationDate?: Date
    expirationDate?: string // should be DD.MM.YYYY
    tickerOptions?: DocumentTicker
    fullNameHash?: string
}
