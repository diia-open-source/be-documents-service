import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import ExpireDocumentAction from '@actions/v1/expireDocument'

import DocumentsExpirationService from '@services/documentsExpiration'

describe(`Action ${ExpireDocumentAction.name}`, () => {
    const testKit = new TestKit()
    const documentsExpirationServiceMock = mockInstance(DocumentsExpirationService)
    const action = new ExpireDocumentAction(documentsExpirationServiceMock)

    it('should return true and process code if deleted document', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { documentType: <DocumentType>'document-type' },
            session,
            headers,
        }

        jest.spyOn(documentsExpirationServiceMock, 'expireDocumentByType').mockResolvedValueOnce()

        expect(await action.handler(args)).toBeUndefined()
        expect(documentsExpirationServiceMock.expireDocumentByType).toHaveBeenCalledWith(
            args.params.documentType,
            args.session.user.identifier,
        )
    })
})
