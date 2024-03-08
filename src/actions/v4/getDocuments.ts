import { AppAction } from '@diia-inhouse/diia-app'

import { BadRequestError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v4/getDocuments'

export default class GetDocumentsAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V4

    readonly name: string = 'getDocuments'

    readonly validationRules: ValidationSchema = {
        filter: {
            type: 'array',
            items: { type: 'string', enum: this.documentsService.documentFilters },
            optional: true,
        },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            session: { user },
            params: { filter = this.documentsService.documentFiltersBySessionType[user.sessionType] },
            headers,
        } = args

        if (!filter) {
            throw new BadRequestError('Filter parameters is not defined')
        }

        return await this.documentsService.getDocuments(args.session, filter, headers, { withCover: true })
    }
}
