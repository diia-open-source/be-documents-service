/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
import { DocumentMetaData, DocumentTicker, Localization, NameValue } from '@diia-inhouse/types'

import { NameValueWithCode } from '@interfaces/services/documents'

export enum DocumentType {
    DriverLicense = 'driver-license',
}

export enum DocumentTypeCamelCase {
    DriverLicense = 'driverLicense',
}

export enum ComponentDocumentName {
    DriverLicense = 'dr_lic',
}

export enum UserDocumentSubtype {
    Permanent = 'permanent',
    IssuedFirst = 'issuedFirst',
}

export enum AddressType {
    REGISTRATION = 100,
    BIRTH = 103,
}

export enum LicenseType {
    permanent = 'permanent',
    issuedFirst = 'issuedFirst',
}

export enum DocumentStatus {
    ISSUED = 1,
    DAMAGED = 2,
    HANDED_FOR_KEEPING = 3,
    HANDED_FOR_DESTROYING = 4,
    OLD = 5,
    ARCHIVED = 6,
    LOST = 7,
    STOLEN = 8,
    STAY = 9,
    RETURNED_AFTER_KEEPING = 10,
    MIGRATION = 11,
    WANTED = 12,
    EXCEPTED = 13,
    CANCELED = 14,
    RECEIVED_FOR_DESTROYING = 1000,
    DESTROYED = 1001,
    TO_BE_EXCLUDED = 1002,
    CANCELED_NEW = 1003,
    INVALID = 1005,
    NEED_CONFIRMATION = 1006,
}

export enum LicenseCategory {
    'КАТЕГОРІЯ A [OLD]' = 'A',
    'КАТЕГОРІЯ B [OLD]' = 'B',
    'КАТЕГОРІЯ C [OLD]' = 'C',
    'КАТЕГОРІЯ D [OLD]' = 'D',
    'КАТЕГОРІЯ A1' = 'A1',
    'КАТЕГОРІЯ A' = 'A',
    'КАТЕГОРІЯ B1' = 'B1',
    'КАТЕГОРІЯ B' = 'B',
    'КАТЕГОРІЯ C1' = 'C1',
    'КАТЕГОРІЯ C' = 'C',
    'КАТЕГОРІЯ D1' = 'D1',
    'КАТЕГОРІЯ D' = 'D',
    'КАТЕГОРІЯ E' = 'E',
    'КАТЕГОРІЯ BE' = 'BE',
    'КАТЕГОРІЯ C1E' = 'C1E',
    'КАТЕГОРІЯ CE' = 'CE',
    'КАТЕГОРІЯ D1E' = 'D1E',
    'КАТЕГОРІЯ DE' = 'DE',
    'КАТЕГОРІЯ ТРОЛЛЕЙБУС/ТРАМВАЙ' = 'Трол/Трам',
    'КАТЕГОРІЯ ТРОЛЛЕЙБУС' = 'Трол',
    'КАТЕГОРІЯ ТРАМВАЙ' = 'Трам',
}

export interface DriverLicenseCategory {
    category: LicenseCategory | string
    openDate: string
}

export interface DriverLicenseDetails {
    card: {
        name: string
        icon: string
        lastName: string
        firstName: string
        middleName?: string
        birthDate: NameValue
        category: NameValue
        documentNumber: NameValue
    }
    name: string
    icon: string
    country: string
    lastName: NameValueWithCode
    firstName: NameValueWithCode
    birthDate: NameValueWithCode
    birth: NameValueWithCode
    issueDate: NameValueWithCode
    expiryDate: NameValueWithCode
    department: NameValueWithCode
    identifier: NameValueWithCode
    documentNumber: NameValueWithCode
    category: NameValueWithCode
    categoryOpeningDate: NameValueWithCode
    categories: DriverLicenseCategoryDetails[]
    tickerOptions?: DocumentTicker
}

export interface DriverLicenseCategoryDetails {
    category: NameValueWithCode
    openingDate: NameValueWithCode
}

export interface DriverLicense extends DocumentMetaData {
    id: string
    docNumber: string
    type?: LicenseType
    clientId: string
    serial: string
    number: string
    issueDate: string
    expirationDate: string
    categories: string
    categoriesFull: DriverLicenseCategory[]
    serialNumber: string
    lastNameUA: string
    firstNameUA: string
    middleNameUA: string
    lastNameEN: string
    firstNameEN: string
    birthday: string | null
    birthPlace: string | null
    departmentId: string | null
    department: string | null
    photo: string
    recordNumber?: string | null
    shareLocalization?: Localization
    [Localization.UA]?: DriverLicenseDetails
    [Localization.ENG]?: DriverLicenseDetails
}
