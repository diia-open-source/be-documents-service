export interface RegistrationAddressRequestData {
    unzr?: string
    rnokpp?: string
    docNumber?: string
    birthСertificate?: {
        seria: string
        number: number
    }
}

export interface AdultRegistrationAddressRequestData {
    first_name: string
    last_name: string
    middle_name: string
    date_birth: string
    unzr: string
    inn: string
}

export enum RegistrationAddressError {
    NotFound = 'За запитом відомості про реєстрацію відсутні',
}

export interface RegistrationAddress {
    registrationAddress: string
    registrationDate?: string
    koatuu?: string
    communityCode?: string
}
