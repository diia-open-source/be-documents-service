import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import { CustomActionArguments } from '@src/documents/driverLicense/interfaces/actions/v1/getDriverLicense'
import { DriverLicenseFull } from '@src/documents/driverLicense/interfaces/providers/hsc'
import DriverLicenseService from '@src/documents/driverLicense/services/document'

import DocumentsExpirationService from '@services/documentsExpiration'

import { DocumentsMetaData } from '@interfaces/services/documentsMetaData'

export default class GetDriverLicenseAction implements AppAction {
    constructor(
        private readonly documentsExpirationService: DocumentsExpirationService,
        private readonly driverLicenseService: DriverLicenseService,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDriverLicense'

    async handler(args: CustomActionArguments): Promise<DriverLicenseFull & DocumentsMetaData> {
        const { user } = args.session

        const driverLicense: DriverLicenseFull = await this.driverLicenseService.getDriverLicenseFull(user.itn)

        return { ...driverLicense, ...this.documentsExpirationService.generateMetaData() }
    }
}
