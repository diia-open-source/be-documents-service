import TestKit, { mockInstance } from '@diia-inhouse/test'

import VerifyServiceEntranceDocumentAction from '@actions/v1/verifyServiceEntranceDocument'

import DocumentsService from '@services/documents'
import DocumentVerificationService from '@services/documentVerification'

import { InternalPassportInstance } from '@interfaces/providers/eis'
import { PassportDocumentType } from '@interfaces/services/passport'

describe(`Action ${VerifyServiceEntranceDocumentAction.name}`, () => {
    const testKit = new TestKit()
    const documentsService = mockInstance(DocumentsService)
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const action = new VerifyServiceEntranceDocumentAction(documentsService, documentVerificationService)

    it('should return service entrance document after verification', async () => {
        const session = testKit.session.getServiceEntranceSession()
        const headers = { ...testKit.session.getHeaders(), token: 'token' }
        const args = {
            params: {
                documentType: PassportDocumentType.InternalPassport,
                otp: 'otp',
            },
            session,
            headers,
        }

        const data: InternalPassportInstance = testKit.docs.generateDocument(PassportDocumentType.InternalPassport)

        jest.spyOn(documentVerificationService, 'verifyDocument').mockResolvedValueOnce(data)

        expect(await action.handler(args)).toMatchObject(data)
        expect(documentVerificationService.verifyDocument).toHaveBeenCalledWith({
            otp: args.params.otp,
            documentType: args.params.documentType,
            token: args.headers.token,
        })
    })
})
