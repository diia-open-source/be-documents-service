import { Document } from 'mongoose'

import { DocumentType } from '@diia-inhouse/types'

export enum ExpirationType {
    Success = 'success',
    PartialUnavailable = 'partial-unavailable',
    RegistryError = 'registry-error',
}

export enum DocumentSettingVersion {
    V1 = 1,
    V2 = 2,
}

export type ExpirationTime = {
    [key in ExpirationType]?: number
}

export interface DocumentSetting {
    type: DocumentType
    version: DocumentSettingVersion
    expirationTime: ExpirationTime
}

export interface DocumentSettingModel extends DocumentSetting, Document {}
