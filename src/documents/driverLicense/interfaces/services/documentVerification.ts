import { DocumentType } from '@diia-inhouse/types'

export interface DriverLicenseAssertParams {
    checkExpirationDocumentType?: DocumentType
    itn: string
}
