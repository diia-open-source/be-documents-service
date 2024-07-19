import { TaskListener } from '@diia-inhouse/diia-queue'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'
import UserService from '@services/user'

import { ServiceTask } from '@interfaces/tasks'
import { EventPayload } from '@interfaces/tasks/processUserDocuments'

export default class ProcessUserDocuments implements TaskListener {
    constructor(
        private readonly documentsService: DocumentsService,
        private readonly userService: UserService,
    ) {
        this.validationRules = {
            userIdentifier: { type: 'string' },
            documentTypes: { type: 'array', items: { type: 'string', enum: this.documentsService.documentTypes } },
        }
    }

    readonly isDelayed: boolean = true

    readonly name: string = ServiceTask.ProcessUserDocuments

    readonly validationRules: ValidationSchema<EventPayload>

    async handler(params: EventPayload): Promise<void> {
        await this.userService.processUserDocuments(params)
    }
}
