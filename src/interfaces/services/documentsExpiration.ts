import { UpdateQuery } from 'mongoose'

import { DocStatus, OwnerType } from '@diia-inhouse/types'

import { PassportType } from '@interfaces/dto/passport'
import { DocumentsExpirationModel } from '@interfaces/models/documentsExpiration'

export interface DocumentIdStatus {
    id: string
    status: DocStatus
    ownerType: OwnerType
}

export interface DocumentExpirationModifier {
    expirationTime: number
    modifier?: UpdateQuery<DocumentsExpirationModel>
}

export interface PassportId {
    id: string
    type: PassportType
    unzr: string
}
