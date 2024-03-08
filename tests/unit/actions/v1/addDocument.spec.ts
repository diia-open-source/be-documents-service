import TestKit, { mockInstance } from '@diia-inhouse/test'

import AddDocumentAction from '@actions/v1/addDocument'

import DocumentsService from '@services/documents'

import { CustomActionArguments } from '@interfaces/actions/v1/addDocument'

describe(`Action ${AddDocumentAction.name}`, () => {
    const testKit = new TestKit()
    const documentsServiceMock = mockInstance(DocumentsService, { addDocumentStrategies: {} })
    const action = new AddDocumentAction(documentsServiceMock)

    it('should throw BadRequestError if not given document type request body', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = <CustomActionArguments>(<unknown>{
            params: {
                documentType: 'document-type',
            },
            session,
            headers,
        })

        await expect(action.handler(args)).rejects.toThrow(`Expected request body for ${args.params.documentType}`)
    })

    it('should return success true and process code', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = <CustomActionArguments>(<unknown>{
            params: {
                documentType: 'document-type',
                'document-type': {},
            },
            session,
            headers,
        })

        jest.spyOn(documentsServiceMock, 'addDocument').mockResolvedValueOnce(100500)

        expect(await action.handler(args)).toMatchObject({ success: true, processCode: 100500 })
        expect(documentsServiceMock.addDocument).toHaveBeenCalledWith({
            documentType: args.params.documentType,
            userIdentifier: args.session.user.identifier,
            mobileUid: args.headers.mobileUid,
            data: {},
        })
    })
})
