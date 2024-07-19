import { DocumentType } from '@src/documents/driverLicense/interfaces/services'

import { DocumentExpirationService } from '@interfaces/services/documents'

export default class DriverLicenseExpirationService implements DocumentExpirationService {
    readonly documentsToSkipExpiration: DocumentType[] = [DocumentType.DriverLicense]
}
