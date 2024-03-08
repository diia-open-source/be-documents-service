import { PassportByInnDocumentType } from '@src/generated'

export enum PassportGenderEN {
    F = 'F',
    M = 'M',
}

export enum PassportGenderUA {
    F = 'Ж',
    M = 'Ч',
}

export enum PassportType {
    ID = 'ID',
    P = 'P',
}

export enum CountryCode {
    Ukr = 'UKR',
}

export enum RegistryPassportSuccessCode {
    Success = 1,
    Error = 0,
}

export interface RegistryPassportResponseWithoutStructuredAddress {
    success: RegistryPassportSuccessCode
    return?: RegistryPassportDTO
    error?: {
        code: string
        message: string
    }
}

export type RegistryPassportResponseWithStructuredAddress = RegistryPassportDTO | RegistryPassportError

export type RegistryPassportResponse = RegistryPassportResponseWithoutStructuredAddress | RegistryPassportResponseWithStructuredAddress

export interface RegistryPassportError {
    code: string
    detail: unknown
}

export interface RegistryPassportDTO {
    unzr: string
    rnokpp: string
    gender: PassportGenderEN
    date_birth: string
    registration: string | RegistryPassportRegistration
    documents: RegistryPassportInstance[]
}

export interface RegistryPassportInstance {
    type: PassportType
    number: string
    date_issue: string
    date_expiry: string
    dep_issue: string
    last_name: string
    last_name_en: string
    first_name: string
    first_name_en: string
    middle_name: string
    middle_name_en: string
    birth_place: string
    photo: string
    signature: string
}

export interface RegistryPassportRegistration {
    cbc_country?: string
    country_id: number | null
    postbox?: string
    address_grom_katottg?: string
    address_koatuu?: string
    address_katotth?: string
    region?: string
    region_district?: string
    city_district?: string
    settlement_district_katottg?: string
    settlement_name?: string
    settlement_type?: string
    street_name?: string
    street_type?: string
    building_number?: string
    building_part?: string
    apartment?: string
    registration_date: string | null // DD.MM.YYYY
    cancelregistration_date: string | null // DD.MM.YYYY
}

export interface RegistryPassportsByInnDTO {
    success: number
    return: RegistryPassportsByInn | RegistryPassportsByInnError
}

export interface RegistryPassportsByInnError {
    error: string
}

export interface RegistryPassportsByInn {
    last_name: string
    first_name: string
    middle_name?: string
    unzr: string
    rnokpp: string
    gender: PassportGenderEN
    date_birth: string
    birth_place: string
    birth_country: string
    birth_country_id: string
    registration: RegistryPassportsByInnRegistration
    documents: {
        documents: boolean
        type: PassportByInnDocumentType
        documentSerial?: string
        number: string
        date_issue: string // DD.MM.YYYY
        date_expiry?: string // DD.MM.YYYY
        dep_issue: string
    }
}

export interface RegistryPassportsByInnRegistration {
    registration_inf: boolean
    postbox?: string
    address_grom_katottg?: string
    address_koatuu?: string
    address_katottg?: string
    region?: string
    district?: string
    settlement_name?: string
    settlement_type?: string
    city_district?: string
    settlement_district_katottg?: string
    street_name?: string
    street_type?: string
    building_number?: string
    building_part?: string
    apartment?: string
    registration_date?: string // DD.MM.YYYY
    cancelregistration_date?: string // DD.MM.YYYY
}
