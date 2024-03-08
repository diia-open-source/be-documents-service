import { randomUUID } from 'crypto'

import { BadRequestError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import DocumentDownloadService from '@services/documentDownload'

import PluginDepsCollectionMock from '@tests/mocks/stubs/documentDepsCollection'

import { DocumentService } from '@interfaces/services/documents'

describe('DocumentDownloadService', () => {
    const testKit = new TestKit()

    describe('method downloadDocument', () => {
        it('should successfully download document with provided type', async () => {
            const documentType = <DocumentType>'document-type'
            const mockDocumentService = <DocumentService>(<unknown>{
                downloadDocument: () => {},
                documentTypes: [documentType],
            })
            const { user } = testKit.session.getUserSession()
            const params = {
                documentId: randomUUID(),
                documentType,
            }
            const expectedResult = {
                documentFile: {
                    file: 'file-content',
                    name: 'diploma.pdf',
                    mimeType: 'application/pdf',
                },
            }

            jest.spyOn(mockDocumentService, 'downloadDocument').mockResolvedValueOnce(expectedResult)

            const documentServices = new PluginDepsCollectionMock([mockDocumentService])
            const documentDownloadService = new DocumentDownloadService(documentServices)

            expect(await documentDownloadService.downloadDocument(params, user)).toEqual(expectedResult)

            expect(mockDocumentService.downloadDocument).toHaveBeenCalledWith(params, user)
        })

        it('should fail with error in case download strategy for provided document type is not defined', async () => {
            const invalidDocumentType = <DocumentType>'invalid-document-type'
            const { user } = testKit.session.getUserSession()
            const params = {
                documentId: randomUUID(),
                documentType: invalidDocumentType,
            }

            const documentServices = new PluginDepsCollectionMock([])
            const documentDownloadService = new DocumentDownloadService(documentServices)

            await expect(async () => {
                await documentDownloadService.downloadDocument(params, user)
            }).rejects.toEqual(new BadRequestError(`DownloadStrategy for ${invalidDocumentType} is not defined`))
        })
    })
})
