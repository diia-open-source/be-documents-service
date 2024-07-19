import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, OnInit, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getDesignSystemDocumentsToProcess'

export default class GetDesignSystemDocumentsToProcess implements AppAction, OnInit {
    constructor(private readonly documentsService: DocumentsService) {
        this.validationRules = {
            documents: {
                type: 'array',
                items: {
                    type: 'object',
                    props: {
                        type: { type: 'string', enum: this.documentTypesCamelCase },
                        eTag: { type: 'string', optional: true },
                    },
                },
            },
        }
    }

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDesignSystemDocumentsToProcess'

    readonly documentTypesCamelCase: string[] = []

    readonly validationRules: ValidationSchema<CustomActionArguments['params']>

    onInit(): void {
        this.documentTypesCamelCase.push(...Object.keys(this.documentsService.documentTypeResponseToDocumentType))
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documents = [] },
            session: { user },
            headers,
        } = args

        return await this.documentsService.getDesignSystemDocumentsToProcess(user, headers, documents)
    }
}
