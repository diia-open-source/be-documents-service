import { randomUUID } from 'node:crypto'

import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetSharingRenderDataByDocumentTypeAction from '@actions/v1/getSharingRenderDataByDocumentType'

import DocumentsService from '@services/documents'

describe(`Action ${GetSharingRenderDataByDocumentTypeAction.name}`, () => {
    const documentsServiceMock = mockInstance(DocumentsService, { addDocumentStrategies: {} })
    const action = new GetSharingRenderDataByDocumentTypeAction(documentsServiceMock)

    it('should successfully return sharing render data by document type', async () => {
        const testKit = new TestKit()
        const session = testKit.session.getUserSession()
        const headers = testKit.session.getHeaders()
        const {
            user: { identifier: requester },
        } = session
        const requestDateTime = new Date().toISOString()
        const requestIdentifier = randomUUID()
        const documentType = 'document-type'

        jest.spyOn(documentsServiceMock, 'getSharingRenderDataByDocumentType').mockReturnValueOnce({})

        expect(
            await action.handler({
                headers,
                params: {
                    data: {},
                    documentType,
                    requestDateTime,
                    requester,
                    requestIdentifier,
                },
            }),
        ).toEqual(expect.any(Object))
        expect(documentsServiceMock.getSharingRenderDataByDocumentType).toHaveBeenCalledWith(
            documentType,
            {},
            requester,
            requestDateTime,
            requestIdentifier,
        )
    })
})
