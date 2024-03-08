import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import ProcessUserDocuments from '@src/tasks/processUserDocuments'

import UserService from '@services/user'

import { EventPayload } from '@interfaces/tasks/processUserDocuments'

describe(`Task ${ProcessUserDocuments.name}`, () => {
    const testKit = new TestKit()
    const userService = mockInstance(UserService)
    const task = new ProcessUserDocuments(userService)

    it('should call UserService.processUserDocuments with provided params', async () => {
        const { user } = testKit.session.getUserSession()
        const { identifier: userIdentifier } = user
        const params: EventPayload = { userIdentifier, documentTypes: [<DocumentType>'document-type-1', <DocumentType>'document-type-2'] }

        const processUserDocumentsSpy = jest.spyOn(userService, 'processUserDocuments')

        await expect(task.handler(params)).resolves.toBeUndefined()
        expect(processUserDocumentsSpy).toHaveBeenCalledWith(params)
    })
})
