import { DocumentType } from '@src/documents/taxpayerCard/interfaces/services'

import { DocumentExpirationService } from '@interfaces/services/documents'

export default class TaxpayerCardExpirationService implements DocumentExpirationService {
    readonly documentsToSkipExpiration: DocumentType[] = [DocumentType.TaxpayerCard]
}
