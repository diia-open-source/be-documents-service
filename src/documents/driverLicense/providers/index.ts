import { Constructor, asClass } from 'awilix'

import { NameAndRegistrationPair } from '@diia-inhouse/diia-app'

import { PluginConfig } from '@src/documents/driverLicense/interfaces/config'
import { DriverLicenseHscServiceProvider, ProvidersDeps } from '@src/documents/driverLicense/interfaces/providers'
import { DocumentType } from '@src/documents/driverLicense/interfaces/services'
import DriverLicenseHscProvider from '@src/documents/driverLicense/providers/hsc'
import DriverLicenseHscMockProvider from '@src/documents/driverLicense/providers/hsc/mock'

import { AppConfig } from '@interfaces/config'

export function getProvidersDeps(config: AppConfig & PluginConfig): NameAndRegistrationPair<ProvidersDeps> {
    const { providerIsEnabled } = config[DocumentType.DriverLicense]

    const driverLicenseHscProvider: Constructor<DriverLicenseHscServiceProvider> = providerIsEnabled
        ? DriverLicenseHscProvider
        : DriverLicenseHscMockProvider

    return {
        driverLicenseHscProvider: asClass(driverLicenseHscProvider).singleton(),
    }
}
