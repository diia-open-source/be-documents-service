import { UserTokenData } from '@diia-inhouse/types'

import { RegistryPassportDTO } from '@interfaces/dto'
import { PassportByInn, PassportByInnRequester } from '@interfaces/providers/dms'
import { PassportFull, PassportsRequestData, Person, Representative } from '@interfaces/providers/eis'

export interface DocumentsEisServiceProvider {
    // TODO(BACK-2386): map to common entity
    getPassports(person: Person, representative: Representative): Promise<RegistryPassportDTO>
    getPassportFull(person: Person, representative: Representative): Promise<PassportFull>
    collectRequestData(user: UserTokenData): PassportsRequestData
}

export interface DocumentsDmsServiceProvider {
    getPassport(user: PassportByInnRequester): Promise<PassportByInn>
}

export type ProvidersDeps = {
    documentsDmsProvider: DocumentsDmsServiceProvider
    documentsEisProvider: DocumentsEisServiceProvider
}
