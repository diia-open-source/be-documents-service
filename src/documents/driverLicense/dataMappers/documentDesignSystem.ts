import { DocumentTypeCamelCase } from '@diia-inhouse/types'

import { ComponentDocumentName } from '@src/documents/driverLicense/interfaces/services'

import { DocumentDesignSystemDataMapper } from '@interfaces/dataMappers'

export default class DriverLicenseDesignSystemDataMapper implements DocumentDesignSystemDataMapper {
    readonly documentTypeToComponentDocumentName: Partial<Record<DocumentTypeCamelCase, ComponentDocumentName>> = {
        [DocumentTypeCamelCase.driverLicense]: ComponentDocumentName.DriverLicense,
    }
}
