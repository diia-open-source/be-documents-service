import { Document } from '@diia-inhouse/db'

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
    type: string
    version: DocumentSettingVersion
    expirationTime: ExpirationTime
    defaultHidden?: boolean
}

export interface DocumentSettingModel extends DocumentSetting, Document {}
