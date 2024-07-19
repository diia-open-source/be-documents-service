import { AppUser } from '@diia-inhouse/types'

import { GetTaxpayerCardResponse } from '@src/documents/taxpayerCard/interfaces/services'

export interface DocumentsDrfoServiceProvider {
    getTaxpayerCard(user: AppUser): Promise<GetTaxpayerCardResponse>
}

export type ProvidersDeps = {
    documentsDrfoProvider: DocumentsDrfoServiceProvider
}
