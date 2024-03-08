import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import DocumentsExpirationService from '@services/documentsExpiration'
import PassportService from '@services/passport'

import { CustomActionArguments } from '@interfaces/actions/v1/getPassports'
import { PassportFull } from '@interfaces/providers/eis'
import { DocumentsMetaData } from '@interfaces/services/documentsMetaData'

export default class GetPassports implements AppAction {
    constructor(
        private readonly documentsExpirationService: DocumentsExpirationService,
        private readonly passportService: PassportService,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getPassports'

    async handler(args: CustomActionArguments): Promise<PassportFull & DocumentsMetaData> {
        const { user } = args.session

        const passport: PassportFull = await this.passportService.getPassportFull(user)

        return { ...passport, ...this.documentsExpirationService.generateMetaData() }
    }
}
