import { TaskListener } from '@diia-inhouse/diia-queue'
import { DocumentType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import UserService from '@services/user'

import { ServiceTask } from '@interfaces/tasks'
import { EventPayload } from '@interfaces/tasks/processUserDocuments'

export default class ProcessUserDocuments implements TaskListener {
    constructor(private readonly userService: UserService) {}

    readonly isDelayed: boolean = true

    readonly name: string = ServiceTask.ProcessUserDocuments

    readonly validationRules: ValidationSchema<EventPayload> = {
        userIdentifier: { type: 'string' },
        documentTypes: { type: 'array', items: { type: 'string', enum: Object.values(DocumentType) } },
    }

    async handler(params: EventPayload): Promise<void> {
        await this.userService.processUserDocuments(params)
    }
}
