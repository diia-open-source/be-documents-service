import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import { ActionResult, CustomActionArguments } from '@src/documents/taxpayerCard/interfaces/action/v1/hasValidTaxpayerCard'
import TaxpayerCardService from '@src/documents/taxpayerCard/services/document'

export default class HasValidTaxpayerCardAction implements AppAction {
    constructor(private readonly taxpayerCardService: TaxpayerCardService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'hasValidTaxpayerCard'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user },
        } = args

        const card = await this.taxpayerCardService.getValidTaxpayerCard(user)

        return !!card
    }
}
