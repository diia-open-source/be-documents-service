import { NotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetIdentityDocumentAction from '@actions/v1/getIdentityDocument'

import DocumentsService from '@services/documents'

import { InternalPassportInstance } from '@interfaces/providers/eis'
import { PassportDocumentType } from '@interfaces/services/passport'

describe(`Action ${GetIdentityDocumentAction.name}`, () => {
    const testKit = new TestKit()
    const documentsService = mockInstance(DocumentsService)
    const action = new GetIdentityDocumentAction(documentsService)

    it('should throw NotFoundError if identity document not found', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            headers,
            session,
        }

        // eslint-disable-next-line unicorn/no-useless-undefined
        jest.spyOn(documentsService, 'getIdentityDocument').mockResolvedValueOnce(undefined)

        await expect(action.handler(args)).rejects.toThrow(new NotFoundError('Identity document not found'))
        expect(documentsService.getIdentityDocument).toHaveBeenCalledWith(args.session.user)
    })

    it('should return identity document', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            headers,
            session,
        }

        const identity = {
            ...(<InternalPassportInstance>testKit.docs.generateDocument(PassportDocumentType.InternalPassport)),
            department: 'department',
            identityType: PassportDocumentType.InternalPassport,
        }

        jest.spyOn(documentsService, 'getIdentityDocument').mockResolvedValueOnce(identity)

        expect(await action.handler(args)).toMatchObject(identity)
        expect(documentsService.getIdentityDocument).toHaveBeenCalledWith(args.session.user)
    })
})
