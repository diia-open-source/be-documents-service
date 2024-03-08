export interface RegistrationAddressDto {
    typ: string
    response: string
    unzr: string
    rnokpp: string
    nationality?: string
    birthСertificate?: {
        seria: string
        number: number
    }
}

export interface AdultRegistrationAddressDto {
    address?: string
    detail?: Record<string, unknown>
}
