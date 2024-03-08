import { DocStatus, Localization, TaxpayerCardInDocument, TickerAtm } from '@diia-inhouse/types'

import { PassportRegistrationInfo } from '@src/generated'

import { PassportGenderEN, PassportGenderUA, PassportType } from '@interfaces/dto'
import { RegistrationAddress } from '@interfaces/providers/usdr'
import { NameValue } from '@interfaces/services'
import { DocumentTicker } from '@interfaces/services/documentAttributes'
import { DocumentMetaData } from '@interfaces/services/documentsMetaData'

export enum NationalityUA {
    Ukraine = 'Україна',
}

export enum NationalityEN {
    Ukraine = 'Ukraine',
}

export interface Representative {
    rnokpp: string
    firstname: string
    lastname: string
    middlename: string
    document?: string
}

export interface Person {
    rnokpp: string
    document?: string
}

export interface PassportsRequestData {
    addressInStructure?: boolean
    person: Person
    representative: Representative
}

export interface TaxpayerCard {
    status: DocStatus
    number: string
    creationDate: string
}

export interface BasePassportInstance extends DocumentMetaData {
    id: string
    docNumber: string
    series?: string
    number: string
    genderUA: PassportGenderUA | string
    genderEN: PassportGenderEN | string
    nationalityUA: NationalityUA | string
    nationalityEN: string
    lastNameUA: string
    lastNameEN: string
    firstNameUA: string
    firstNameEN: string
    middleNameUA: string
    birthday: string
    birthPlaceUA: string
    birthPlaceEN: string
    issueDate: string
    expirationDate: string
    recordNumber: string
    taxpayerCard?: TaxpayerCard
    photo: string
    sign: string
    type: PassportType
    documentRegistrationPlaceUA: string
    currentRegistrationPlaceUA: string
    shareLocalization?: Localization
}

export interface InternalPassportInstance extends BasePassportInstance {
    department: string
}

export interface ForeignPassportInstance extends BasePassportInstance {
    departmentUA: string
    departmentEN: string
    typeUA: string
    typeEN: string
    countryCode: string
    [Localization.UA]?: ForeignPassportInstanceDetails
    [Localization.ENG]?: ForeignPassportInstanceDetails
}

export type Passport = InternalPassportInstance | ForeignPassportInstance

export interface ForeignPassportInstanceDetails {
    card: {
        name: string
        icon: string
        lastName: string
        firstName: string
        middleName?: string
        birthDate: NameValue
        docNumber: NameValue
    }
    name: string
    icon: string
    country: string
    docNumber: NameValue
    lastName: string
    firstName: string
    gender: NameValue
    birthDate: NameValue
    nationality: NameValue
    department: NameValue
    issueDate: NameValue
    expiryDate: NameValue
    identifier: NameValue
    type: NameValue
    countryCode: NameValue
    taxpayer?: TaxpayerCardInDocument
    birthPlace: NameValue
    residenceRegistrationPlace: NameValue
    registrationDate: NameValue
    tickerOptions?: DocumentTicker
}

export interface PassportFull {
    data: PassportFullInstance[]
}

export interface PassportFullInstance {
    type: PassportType
    firstNameUA: string
    middleNameUA: string
    lastNameUA: string
    firstNameEN: string
    lastNameEN: string
    birthDate: string
    number: string
    personImage: string
    signatureImage: string
    genderUA: PassportGenderUA | string
    genderEN: PassportGenderEN | string
    nationalityUA: NationalityUA
    nationalityEN: NationalityEN
    issueData: string
    expirationData: string
    authority: string
    countryCode: string
    birthPlace: string
    recordNumber: string
    rnokpp: string
}

export interface Passports {
    passports: Passport[]
    registration?: PassportRegistrationInfo
    registrationAddress?: RegistrationAddress
}

export interface ForeignPassportFrontCardInfo {
    docNumber: string
    ticker: TickerAtm
    fullName: string
    birthDate: string
}
