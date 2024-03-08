import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import GetDocumentByBarcodeAction from '@actions/v1/getDocumentByBarcode'

import DocumentVerificationService from '@services/documentVerification'

import { Document } from '@interfaces/services/documents'

describe(`Action ${GetDocumentByBarcodeAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new GetDocumentByBarcodeAction(documentVerificationService)

    it('should return document by bar code', async () => {
        const headers = testKit.session.getHeaders()
        const args = {
            params: {
                documentType: <DocumentType>'document-type',
                barcode: 'barcode',
            },
            headers,
        }

        const document = <Document>{}

        jest.spyOn(documentVerificationService, 'getDocumentByBarcode').mockResolvedValueOnce(document)

        expect(await action.handler(args)).toMatchObject(document)
        expect(documentVerificationService.getDocumentByBarcode).toHaveBeenCalledWith(args.params.documentType, args.params.barcode)
    })
})
