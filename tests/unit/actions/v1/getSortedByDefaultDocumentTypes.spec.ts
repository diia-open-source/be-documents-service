import { mockInstance } from '@diia-inhouse/test'
import { SessionType } from '@diia-inhouse/types'

import GetSortedByDefaultDocumentTypesAction from '@actions/v1/getSortedByDefaultDocumentTypes'

import DocumentsService from '@services/documents'

import { DocumentsDefaultOrder } from '@interfaces/services/documents'

describe(`Action ${GetSortedByDefaultDocumentTypesAction.name}`, () => {
    const documentsServiceMock = mockInstance(DocumentsService, { addDocumentStrategies: {} })
    const action = new GetSortedByDefaultDocumentTypesAction(documentsServiceMock)

    it('should successfully return sorted by default document types list', async () => {
        const expectedResult = { sortedDocumentTypes: { [SessionType.User]: { items: ['docyment-type1', 'document-type2'] } } }

        jest.spyOn(documentsServiceMock, 'getSortedByDefaultDocumentTypes').mockReturnValueOnce(
            <DocumentsDefaultOrder>expectedResult.sortedDocumentTypes,
        )

        expect(await action.handler()).toMatchObject(expectedResult)
        expect(documentsServiceMock.getSortedByDefaultDocumentTypes).toHaveBeenCalledWith()
    })
})
