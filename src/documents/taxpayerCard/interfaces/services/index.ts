import { DocumentMetaData } from '@interfaces/services/documentsMetaData'

export enum DocumentType {
    TaxpayerCard = 'taxpayer-card',
}

export enum DocumentTypeCamelCase {
    TaxpayerCard = 'taxpayerCard',
}

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
