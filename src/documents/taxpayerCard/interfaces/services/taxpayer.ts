import { DocStatus } from '@diia-inhouse/types'

import { DocumentMetaData } from '@interfaces/services/documentsMetaData'

export interface TaxpayerCard extends DocumentMetaData {
    isVisible: boolean
    id: string
    docNumber: string
    lastNameUA: string
    firstNameUA: string
    middleNameUA: string
    birthday: string
    creationDate: string
}

export interface GetTaxpayerCardResponse {
    card: TaxpayerCard
    expirationTime?: number
}

export interface TaxpayerCardInDocument {
    name: string
    value: string
    status: DocStatus
    statusDescription: string
}
