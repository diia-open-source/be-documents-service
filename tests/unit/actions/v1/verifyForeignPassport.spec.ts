import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import VerifyForeignPassportAction from '@actions/v1/verifyForeignPassport'

import DocumentVerificationService from '@services/documentVerification'

import Utils from '@utils/index'

describe(`Action ${VerifyForeignPassportAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const utils = mockInstance(Utils)
    const action = new VerifyForeignPassportAction(documentVerificationService, utils)

    it('should return foreign passport after verification', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                otp: 'otp',
            },
            session,
            headers: { ...headers, token: 'token' },
        }

        const foreignPassport = testKit.docs.getForeignPassport()

        jest.spyOn(documentVerificationService, 'verifyDocument').mockResolvedValueOnce(foreignPassport)

        expect(await action.handler(args)).toMatchObject(foreignPassport)
        expect(documentVerificationService.verifyDocument).toHaveBeenCalledWith({
            otp: args.params.otp,
            documentType: DocumentType.ForeignPassport,
            token: args.headers.token,
        })
    })
})
