import { randomUUID } from 'node:crypto'

import { BadRequestError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'

import DocumentDownloadService from '@services/documentDownload'

import { DocumentDownloadResponse, DocumentService } from '@interfaces/services/documents'

describe('DocumentDownloadService', () => {
    const testKit = new TestKit()

    describe('method downloadDocument', () => {
        it('should successfully download document with provided type', async () => {
            const documentType = 'document-type'
            const mockDocumentService = <Partial<DocumentService<string, string>>>{
                downloadDocument: async () => <DocumentDownloadResponse>{},
                documentTypes: [documentType],
            }
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

            const documentDownloadService = new DocumentDownloadService([mockDocumentService])

            documentDownloadService.onRegistrationsFinished()

            expect(await documentDownloadService.downloadDocument(params, user)).toEqual(expectedResult)

            expect(mockDocumentService.downloadDocument).toHaveBeenCalledWith(params, user)
        })

        it('should fail with error in case download strategy for provided document type is not defined', async () => {
            const invalidDocumentType = 'invalid-document-type'
            const { user } = testKit.session.getUserSession()
            const params = {
                documentId: randomUUID(),
                documentType: invalidDocumentType,
            }

            const documentDownloadService = new DocumentDownloadService([])

            await expect(async () => {
                await documentDownloadService.downloadDocument(params, user)
            }).rejects.toEqual(new BadRequestError(`DownloadStrategy for ${invalidDocumentType} is not defined`))
        })
    })
})
