import { Constructor, asClass } from 'awilix'

import { DepsResolver } from '@diia-inhouse/diia-app'

import { DocumentType } from '@diia-inhouse/types'

import { PluginConfig } from '@src/documents/driverLicense/interfaces/config'
import { DriverLicenseHscServiceProvider, ProvidersDeps } from '@src/documents/driverLicense/interfaces/providers'
import DriverLicenseHscProvider from '@src/documents/driverLicense/providers/hsc'
import DriverLicenseHscMockProvider from '@src/documents/driverLicense/providers/hsc/mock'

import { AppConfig } from '@interfaces/config'

export function getProvidersDeps(config: AppConfig & PluginConfig): DepsResolver<ProvidersDeps> {
    const { providerIsEnabled } = config[DocumentType.DriverLicense]

    const driverLicenseHscProvider: Constructor<DriverLicenseHscServiceProvider> = providerIsEnabled
        ? DriverLicenseHscProvider
        : DriverLicenseHscMockProvider

    return {
        driverLicenseHscProvider: asClass(driverLicenseHscProvider).singleton(),
    }
}
