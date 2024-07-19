import TestKit, { mockInstance } from '@diia-inhouse/test'

import ProcessUserDocuments from '@src/tasks/processUserDocuments'

import DocumentsService from '@services/documents'
import UserService from '@services/user'

import { EventPayload } from '@interfaces/tasks/processUserDocuments'

describe(`Task ${ProcessUserDocuments.name}`, () => {
    const testKit = new TestKit()
    const documentsService = mockInstance(DocumentsService)
    const userService = mockInstance(UserService)
    const task = new ProcessUserDocuments(documentsService, userService)

    it('should call UserService.processUserDocuments with provided params', async () => {
        const { user } = testKit.session.getUserSession()
        const { identifier: userIdentifier } = user
        const params: EventPayload = { userIdentifier, documentTypes: ['document-type-1', 'document-type-2'] }

        const processUserDocumentsSpy = jest.spyOn(userService, 'processUserDocuments')

        await expect(task.handler(params)).resolves.toBeUndefined()
        expect(processUserDocumentsSpy).toHaveBeenCalledWith(params)
    })
})
