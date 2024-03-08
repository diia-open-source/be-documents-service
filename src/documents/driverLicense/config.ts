import { EnvService } from '@diia-inhouse/env'
import { DocumentType } from '@diia-inhouse/types'

import { PluginConfig } from '@src/documents/driverLicense/interfaces/config'

export default async (envService: EnvService): Promise<PluginConfig> => ({
    [DocumentType.DriverLicense]: {
        providerIsEnabled: envService.getVar('HSC_IS_ENABLED', 'boolean', false),
        returnExpired: envService.getVar('HSC_RETURN_EXPIRED', 'boolean', true),
    },
})
