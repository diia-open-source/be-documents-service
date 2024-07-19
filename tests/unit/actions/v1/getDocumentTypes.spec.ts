import { mockInstance } from '@diia-inhouse/test'

import GetDocumentTypesAction from '@actions/v1/getDocumentTypes'

import DocumentsService from '@services/documents'

import { PassportDocumentType } from '@interfaces/services/passport'

describe(`Action ${GetDocumentTypesAction.name}`, () => {
    const documentsServiceMock = mockInstance(DocumentsService, { documentTypes: Object.values(PassportDocumentType) })
    const action = new GetDocumentTypesAction(documentsServiceMock)

    it('should successfully return document types list', async () => {
        expect(await action.handler()).toEqual({
            documentTypes: [PassportDocumentType.InternalPassport, PassportDocumentType.ForeignPassport],
        })
    })
})
