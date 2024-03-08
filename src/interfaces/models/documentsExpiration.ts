import { Document } from 'mongoose'

import { DocStatus, DocumentType, OwnerType } from '@diia-inhouse/types'

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

type Expirations = { [key in DocumentType]?: DocumentIdsExpiration }

export interface DocumentsExpiration extends Expirations {
    mobileUid: string
    userIdentifier: string
}

export interface DocumentsExpirationModel extends DocumentsExpiration, Document {}
