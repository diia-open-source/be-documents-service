import { BadRequestError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import AddDocumentAction from '@actions/v2/addDocument'

import DocumentsService from '@services/documents'

import { CustomActionArguments } from '@interfaces/actions/v2/addDocument'

describe('AddDocumentAction', () => {
    const testKit = new TestKit()
    const documentsServiceMock = mockInstance(DocumentsService, {
        addDocumentStrategies: {},
    })

    const { user } = testKit.session.getUserSession()
    const headers = testKit.session.getHeaders()

    const action = new AddDocumentAction(documentsServiceMock)

    const docData = {
        [Symbol('test')]: 'test',
    }

    const documentType = 'document-type'
    const params = {
        documentType,
        userIdentifier: user.identifier,
        mobileUid: headers.mobileUid,
    }

    it('should call documentsService and return processCode', async () => {
        const processCode = 100500
        const customActionArguments = <CustomActionArguments>(<unknown>{
            params: {
                ...params,
                [documentType]: docData,
            },
            headers,
        })

        const addDocumentSpy = jest.spyOn(documentsServiceMock, 'addDocument').mockResolvedValueOnce(processCode)

        await expect(action.handler(customActionArguments)).resolves.toStrictEqual({
            processCode,
        })

        expect(addDocumentSpy).toHaveBeenCalledWith({
            documentType,
            data: docData,
            userIdentifier: customActionArguments.params?.userIdentifier,
            mobileUid: customActionArguments.params?.mobileUid,
        })
    })

    it('should throw BadRequestError', async () => {
        const customActionArguments = <CustomActionArguments>(<unknown>{
            params: {
                ...params,
                [documentType]: undefined,
            },
            headers,
        })

        await expect(action.handler(customActionArguments)).rejects.toBeInstanceOf(BadRequestError)
    })

    it('should return undefined if method addDocument is return nothing', async () => {
        const customActionArguments = <CustomActionArguments>(<unknown>{
            params: {
                ...params,
                [documentType]: docData,
            },
            headers,
        })

        jest.spyOn(documentsServiceMock, 'addDocument').mockResolvedValueOnce(undefined)

        await expect(action.handler(customActionArguments)).resolves.toBeUndefined()
    })
})
