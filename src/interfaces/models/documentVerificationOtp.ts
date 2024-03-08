import { Document } from 'mongoose'

import { DocStatus, DocumentType, Localization, OwnerType } from '@diia-inhouse/types'

export interface DocumentVerificationOtp {
    userIdentifier: string
    documentId: string
    requestorJWE: string
    consumerJWE?: string
    registryDocumentType: DocumentType
    hash: string
    ownerType: OwnerType
    docStatus: DocStatus
    expirationDate: Date
    usedDate?: Date
    barcode?: string
    localization?: Localization
}

export interface DocumentVerificationOtpModel extends DocumentVerificationOtp, Document {}
