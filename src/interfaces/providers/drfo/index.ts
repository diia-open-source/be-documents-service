export interface RegisterApplicationResponse {
    applicationNumber: string
    applicationDate: string
}

export enum CheckApplicationResponseCode {
    NotFound = '1001',
    TaxpayerNotProvided = '1002', // undescribed error code
    AlreadyAnswered = '1003',
    InProgress = '1004',
    Confirmed = '0',
    NotConfirmed = '1',
    Closed = '2',
    InvalidData = '3',
    NotMatched = '4',
    NotMatchedAndClosed = '42',
}

export interface Taxpayer {
    RNOKPP: string
    givenName: string
    familyName: string
    patronymicName: string
}

export interface RegisterApplicationRequest {
    rnokpp: string
    given_name: string
    family_name: string
    patronymic_name: string
}

export interface CheckApplicationRequest {
    rnokpp: string
    applicationNumber: string
    applicationDate: string
}

export type TaxpayerApplicationRequest = RegisterApplicationRequest | CheckApplicationRequest

export interface RegisterApplicationRegistryResponse {
    applicationNumber: string
    applicationDate: string
    error: string
}

export interface CheckApplicationRegistryResponse {
    error: CheckApplicationResponseCode
    rnokpp: string
    result?: CheckApplicationResponseCode
}

export interface RnokppPayload {
    rnokpp: string
    given_name: string
    family_name: string
    patronymic_name: string
    date_birth: string
}

export enum RnokppErrorCode {
    Ok = '0',
    NotConfirmed = '1',
    Closed = '2',
    InvalidData = '3',
    NotMatched = '4',
    NotMatchedAndClosed = '42',
}

export interface RnokppResponse {
    error: RnokppErrorCode
}
