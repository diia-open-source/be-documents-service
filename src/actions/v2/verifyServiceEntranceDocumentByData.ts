import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/verifyServiceEntranceDocumentByData'

export default class VerifyServiceEntranceDocumentByDataAction implements AppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.ServiceEntrance

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'verifyServiceEntranceDocumentByData'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        qrCode: { type: 'string' },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const { params, headers } = args

        return await this.documentVerificationService.verifyDocumentByData(params, headers, true)
    }
}
