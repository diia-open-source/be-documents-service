export enum VerificationStatus {
    Valid = 'VERIFICATION_STATUS_VALID',
    Invalid = 'VERIFICATION_STATUS_INVALID',
}

export enum ValidatorReportType {
    Short = 'SHORT',
    Full = 'FULL',
}

export enum VerificationError {
    GREEN_CERTIFICATE_EXPIRED = 'GREEN_CERTIFICATE_EXPIRED',
    CERTIFICATE_EXPIRED = 'CERTIFICATE_EXPIRED',
    CERTIFICATE_REVOKED = 'CERTIFICATE_REVOKED',
    VERIFICATION_FAILED = 'VERIFICATION_FAILED',
    TEST_DATE_IS_IN_THE_FUTURE = 'TEST_DATE_IS_IN_THE_FUTURE',
    TEST_RESULT_POSITIVE = 'TEST_RESULT_POSITIVE',
    RECOVERY_NOT_VALID_SO_FAR = 'RECOVERY_NOT_VALID_SO_FAR',
    RECOVERY_NOT_VALID_ANYMORE = 'RECOVERY_NOT_VALID_ANYMORE',
    RULES_VALIDATION_FAILED = 'RULES_VALIDATION_FAILED',
    CRYPTOGRAPHIC_SIGNATURE_INVALID = 'CRYPTOGRAPHIC_SIGNATURE_INVALID',
}

export enum ValidatorCertificateType {
    UNKNOWN = 'UNKNOWN',
    VACCINATION = 'VACCINATION',
    RECOVERY = 'RECOVERY',
    TEST = 'TEST',
}

export enum ValidationResultResult {
    PASSED = 'PASSED',
    FAIL = 'FAIL',
    OPEN = 'OPEN',
}

export interface ValidationRequest {
    data: string | undefined
    validatorCountry: 'ua'
    reportType: ValidatorReportType
}

export interface ValidationShortResponse {
    verificationStatus: VerificationStatus
}

export interface ValidationGreenCertificateBase {
    schemaVersion: string
    person: {
        standardisedFamilyName: string
        familyName: string
        standardisedGivenName: string
        givenName: string
    }
    dateOfBirth: string
    issuingCountry: string
    dgci: string
    type: ValidatorCertificateType
}

export interface ValidationGreenCertificateVaccinations extends ValidationGreenCertificateBase {
    type: ValidatorCertificateType.VACCINATION
    vaccinations: ValidationVaccinationResponse[]
}

export interface ValidationGreenCertificateRecovery extends ValidationGreenCertificateBase {
    type: ValidatorCertificateType.RECOVERY
    recoveryStatements: ValidationRecoveryResponse[]
}

export interface ValidationGreenCertificateTest extends ValidationGreenCertificateBase {
    type: ValidatorCertificateType.TEST
    tests: ValidationTestResponse[]
}

export type ValidationGreenCertificate =
    | ValidationGreenCertificateVaccinations
    | ValidationGreenCertificateRecovery
    | ValidationGreenCertificateTest

export interface ValidationFullResponse {
    greenCertificate?: ValidationGreenCertificate
    issuedAt?: string
    expirationTime?: string
    verificationError?: VerificationError
    validationResults: ValidationResult
}

export interface ValidationResult {
    identifier: string
    result: ValidationResultResult
    version: string
    description: {
        en: string
        ua?: string
    }
}

export interface ValidationVaccinationResponse {
    disease: string
    vaccine: string
    medicinalProduct: string
    manufacturer: string
    doseNumber: number
    totalSeriesOfDoses: number
    dateOfVaccination: string
    countryOfVaccination: string
    certificateIssuer: string
    certificateIdentifier: string
}

export interface ValidationTestResponse {
    disease: string
    typeOfTest: string
    dateTimeOfCollection: string
    testResult: string
    testingCentre: string
    testName?: string
    testNameAndManufacturer?: string
    countryOfVaccination: string
    certificateIssuer: string
    certificateIdentifier: string
    resultNegative: boolean
    dateInThePast: boolean
    testResultType: string
}

export interface ValidationRecoveryResponse {
    disease: string
    dateOfFirstPositiveTest: string
    countryOfVaccination: string
    certificateIssuer: string
    certificateValidFrom: string
    certificateValidUntil: string
    certificateIdentifier: string
    certificateNotValidSoFar: boolean
    certificateNotValidAnymore: boolean
}
