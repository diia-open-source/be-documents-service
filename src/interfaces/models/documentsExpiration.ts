import { Document } from '@diia-inhouse/db'
import { DocStatus, OwnerType } from '@diia-inhouse/types'

export interface DocumentIdStatusByOwnerType {
    value: DocStatus
    ownerType: OwnerType
}

export interface DocumentIdsStatuses {
    [key: string]: DocumentIdStatusByOwnerType
}

export interface DocumentIdsExpiration {
    date: Date
    statuses?: DocumentIdsStatuses
    eTag?: string
}

type Expirations = Record<string, DocumentIdsExpiration | unknown>

export interface DocumentsExpiration extends Expirations {
    mobileUid: string
    userIdentifier: string
}

export interface DocumentsExpirationModel extends DocumentsExpiration, Document {}
