import { AppAction } from '@diia-inhouse/diia-app'

import { BadRequestError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v2/addDocument'

export default class AddDocumentAction implements AppAction {
    constructor(private readonly documentsService: DocumentsService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V2

    readonly name: string = 'addDocument'

    readonly validationRules: ValidationSchema = {
        userIdentifier: { type: 'string' },
        mobileUid: { type: 'string' },
        documentType: { type: 'string', enum: Object.keys(this.documentsService.addDocumentStrategies) },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { userIdentifier, mobileUid, documentType, ...rest },
        } = args

        const documentDataFromRest = documentType in rest && rest[documentType]

        if (!documentDataFromRest) {
            throw new BadRequestError(`Expected request body for ${documentType}`)
        }

        const processCode = await this.documentsService.addDocument({
            documentType: documentType,
            userIdentifier,
            mobileUid,
            data: documentDataFromRest,
        })

        if (!processCode) {
            return
        }

        return { processCode }
    }
}
