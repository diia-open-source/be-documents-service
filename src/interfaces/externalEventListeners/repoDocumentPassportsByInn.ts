import { RegistryPassportsByInnDTO } from '@interfaces/dto'

export interface PassportsByInnRequest {
    last_name: string
    first_name: string
    middle_name?: string
    inn: string
}

export type PassportsByInnResponse = RegistryPassportsByInnDTO
