import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import HasDocumentInRegistryAction from '@actions/v1/hasDocumentInRegistry'

import DocumentsService from '@services/documents'

describe(`Action ${HasDocumentInRegistryAction.name}`, () => {
    const testKit = new TestKit()
    const documentsService = mockInstance(DocumentsService)
    const action = new HasDocumentInRegistryAction(documentsService)

    it('should return true if found document in registry', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                documentType: <DocumentType>'document-type',
            },
            session,
            headers,
        }

        jest.spyOn(documentsService, 'hasDocumentInRegistry').mockResolvedValueOnce(true)

        expect(await action.handler(args)).toBeTruthy()
        expect(documentsService.hasDocumentInRegistry).toHaveBeenCalledWith(args.params.documentType, args.session.user)
    })
})
