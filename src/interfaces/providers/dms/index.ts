import { UserTokenData } from '@diia-inhouse/types'

import { PassportByInnDocumentType, PassportRegistrationInfo } from '@src/generated'

import { PassportGenderEN, RegistryPassportsByInnRegistration } from '@interfaces/dto'

export type PassportByInnRequester = Pick<UserTokenData, 'itn' | 'lName' | 'fName' | 'mName'>

export interface PassportByInn {
    passport?: PassportInfo
    registration: PassportRegistrationInfo
    registrationV1: PassportByInnRegistrationInfo
}

export interface PassportInfo {
    lastNameUA: string
    firstNameUA: string
    middleNameUA?: string
    recordNumber: string
    genderEN: PassportGenderEN
    birthday: string
    birthCountry: string
    birthPlaceUA: string
    type: PassportByInnDocumentType
    docSerial?: string
    docNumber: string
    issueDate: string
    expirationDate?: string
    department: string
}

export interface PassportByInnRegistrationInfo {
    address: PassportByInnRegistration
    registrationDate?: Date
    deregistrationDate?: Date
    fullName?: string
}

export interface PassportByInnRegistration extends RegistryPassportsByInnRegistration {
    regionName?: string
    districtName?: string
    cityDistrictName?: string
}
