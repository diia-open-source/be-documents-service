import { LicenseCategory } from '@diia-inhouse/types'

import { Client, ClientAddress, IdWithValue } from '@interfaces/dto/client'

export interface Category {
    readonly category: string
    readonly dopen: string
}

export interface DriverLicenseDocumentDTO {
    readonly id: number
    readonly clientId: number
    readonly department: IdWithValue
    readonly docType: IdWithValue
    readonly status: IdWithValue
    readonly country: IdWithValue
    readonly categories: Category[]
    readonly photo: string
    readonly ddoc: string
    readonly ndoc: string
    readonly sdoc: string
    readonly dend: string
}

export interface RegistryDriverLicenseDTO {
    readonly driverLicense: DriverLicenseDocumentDTO[]
    readonly client: Client
    readonly clientAddr: ClientAddress[]
}

export interface DriverLicenseDocument {
    id: number
    dend: Date | string
    categories: (LicenseCategory | string)[]
    sdoc: string
    ndoc: string
    department: IdWithValue
    photo: string
    status: IdWithValue
}

export interface DriverLicenseFull {
    driverLicense: DriverLicenseDocument[]
    client: Client
    clientAddr: ClientAddress[]
}
