import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import VerifyInternalPassportAction from '@actions/v1/verifyInternalPassport'

import DocumentVerificationService from '@services/documentVerification'

import Utils from '@utils/index'

import { idCard } from '@tests/mocks/stubs/passport'

import { InternalPassportInstance } from '@interfaces/providers/eis'

describe(`Action ${VerifyInternalPassportAction.name}`, () => {
    const testKit = new TestKit()
    const documentVerificationService = mockInstance(DocumentVerificationService)
    const utils = mockInstance(Utils)
    const action = new VerifyInternalPassportAction(documentVerificationService, utils)

    it('should return internal passport after verification', async () => {
        const { headers, session } = testKit.session.getUserActionArguments()
        const args = {
            params: {
                otp: 'otp',
            },
            session,
            headers: { ...headers, token: 'token' },
        }

        const identity: InternalPassportInstance = idCard

        jest.spyOn(documentVerificationService, 'verifyDocument').mockResolvedValueOnce(identity)

        expect(await action.handler(args)).toMatchObject(identity)
        expect(documentVerificationService.verifyDocument).toHaveBeenCalledWith({
            otp: args.params.otp,
            documentType: DocumentType.InternalPassport,
            token: args.headers.token,
        })
    })
})
