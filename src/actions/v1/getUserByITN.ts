import { pick } from 'lodash'

import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import DocumentsExpirationService from '@services/documentsExpiration'

import { CustomActionArguments, TaxPayerDTO } from '@interfaces/actions/v1/getUserByITN'
import { AppConfig } from '@interfaces/config'
import { DocumentsMetaData } from '@interfaces/services/documentsMetaData'

export default class GetUserByITNAction implements AppAction {
    constructor(
        private readonly documentsExpirationService: DocumentsExpirationService,
        private readonly config: AppConfig,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getUserByITN'

    async handler(args: CustomActionArguments): Promise<TaxPayerDTO & DocumentsMetaData> {
        const { user } = args.session

        const defaultTaxPayer: TaxPayerDTO = {
            fName: '',
            mName: '',
            lName: '',
            itn: '',
            birthDay: '',
        }

        const returnItnDataIsEnabled: boolean = this.config.returnItnDataIsEnabled
        const fieldsToFill: string[] = returnItnDataIsEnabled ? ['fName', 'mName', 'lName', 'itn', 'birthDay'] : ['fName']
        const taxPayer: TaxPayerDTO = { ...defaultTaxPayer, ...pick(user, fieldsToFill) }

        return { ...taxPayer, ...this.documentsExpirationService.generateMetaData() }
    }
}
