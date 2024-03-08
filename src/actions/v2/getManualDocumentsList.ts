import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'

import ManualDocumentsListService from '@services/manualDocumentsList'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/getManualDocumentsList'

export default class GetManualDocumentsListAction implements AppAction {
    constructor(private readonly manualDocumentsListService: ManualDocumentsListService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'getManualDocumentsList'

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user },
        } = args

        return await this.manualDocumentsListService.getList(user)
    }
}
