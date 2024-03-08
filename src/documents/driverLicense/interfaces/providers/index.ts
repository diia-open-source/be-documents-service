import { DriverLicenseFull, RegistryDriverLicenseDTO } from '@src/documents/driverLicense/interfaces/providers/hsc'

export interface DriverLicenseHscServiceProvider {
    // TODO(BACK-2386): map to common entity
    getDriverLicense(itn: string, ignoreCache?: boolean): Promise<RegistryDriverLicenseDTO>
    getDriverLicenseFull(itn: string): Promise<DriverLicenseFull>
}

export type ProvidersDeps = {
    driverLicenseHscProvider: DriverLicenseHscServiceProvider
}
