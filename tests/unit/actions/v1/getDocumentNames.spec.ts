import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetDocumentNamesAction from '@actions/v1/getDocumentNames'

import DocumentsService from '@services/documents'

describe(`Action ${GetDocumentNamesAction.name}`, () => {
    const documentsServiceMock = mockInstance(DocumentsService, { addDocumentStrategies: {} })
    const action = new GetDocumentNamesAction(documentsServiceMock)
    const testKit = new TestKit()

    it('should successfully return document type to name records', async () => {
        const expectedResult = { documentTypeToName: { 'docyment-type': 'Document name' } }

        jest.spyOn(documentsServiceMock, 'getDocumentNames').mockReturnValueOnce(<Record<string, string>>expectedResult.documentTypeToName)

        expect(
            await action.handler({
                headers: testKit.session.getHeaders(),
                params: { documentTypes: [] },
            }),
        ).toMatchObject(expectedResult)
        expect(documentsServiceMock.getDocumentNames).toHaveBeenCalledWith([])
    })
})
