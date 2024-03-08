import { randomUUID } from 'crypto'

import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import DeleteDocumentAction from '@actions/v1/deleteDocument'

import DocumentsService from '@services/documents'

describe(`Action ${DeleteDocumentAction.name}`, () => {
    const testKit = new TestKit()
    const documentsServiceMock = mockInstance(DocumentsService)
    const action = new DeleteDocumentAction(documentsServiceMock)

    it('should return true and process code if deleted document', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { documentType: <DocumentType>'document-type', documentId: randomUUID(), force: true },
            session,
            headers,
        }

        jest.spyOn(documentsServiceMock, 'deleteDocument').mockResolvedValueOnce(100500)

        expect(await action.handler(args)).toMatchObject({
            success: true,
            processCode: 100500,
        })
        expect(documentsServiceMock.deleteDocument).toHaveBeenCalledWith(
            args.session.user,
            args.params.documentType,
            args.params.documentId,
            headers.mobileUid,
            args.params.force,
        )
    })
})
