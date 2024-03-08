import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType, SessionType } from '@diia-inhouse/types'

import GetDocumentsAction from '@src/actions/v2/getDocuments'

import DocumentsService from '@services/documents'

import { CustomActionArguments } from '@interfaces/actions/v2/getDocuments'

describe('GetDocumentsAction', () => {
    const documentsServiceMock = mockInstance(DocumentsService, {
        documentFilters: [<DocumentType>'document-filter-1', <DocumentType>'document-filter-2'],
        documentFiltersBySessionType: {
            [SessionType.User]: [<DocumentType>'document-filter-3', <DocumentType>'document-filter-4'],
            [SessionType.CabinetUser]: undefined,
        },
    })

    const action = new GetDocumentsAction(documentsServiceMock)
    const testKit = new TestKit()
    const userSession = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should get documents with provided filter', async () => {
        const documents = {
            documentsTypeOrder: ['document-type'],
            expirationDate: new Date().toLocaleDateString(),
            currentDate: new Date().toLocaleDateString(),
        }

        const customActionArguments: CustomActionArguments = {
            session: userSession,
            params: { filter: [<DocumentType>'document-filter-1'] },
            headers,
        }

        jest.spyOn(documentsServiceMock, 'getDocuments').mockResolvedValueOnce(documents)

        await action.handler(customActionArguments)

        expect(documentsServiceMock.getDocuments).toHaveBeenCalledWith(
            customActionArguments.session,
            customActionArguments.params.filter,
            customActionArguments.headers,
        )
    })

    it('should throw a BadRequestError if no filter is defined', async () => {
        const cabinetUserSession = testKit.session.getCabinetUserSession()
        const customActionArguments = <CustomActionArguments>(<unknown>{
            session: cabinetUserSession,
            params: {
                filter: undefined,
            },
            headers,
        })

        await expect(action.handler(customActionArguments)).rejects.toThrow(BadRequestError)
    })

    it('should get documents with default filter', async () => {
        const customActionArguments = <CustomActionArguments>(<unknown>{
            session: userSession,
            params: { filter: undefined },
            headers,
        })

        await expect(action.handler(customActionArguments)).resolves.toBeUndefined()

        expect(documentsServiceMock.getDocuments).toHaveBeenCalledWith(
            customActionArguments.session,
            documentsServiceMock.documentFiltersBySessionType[customActionArguments.session.sessionType],
            customActionArguments.headers,
        )
    })
})
