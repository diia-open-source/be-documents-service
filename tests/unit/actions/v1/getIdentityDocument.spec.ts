import { NotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocumentType } from '@diia-inhouse/types'

import GetIdentityDocumentAction from '@actions/v1/getIdentityDocument'

import DocumentsService from '@services/documents'

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
            ...testKit.docs.getInternalPassport(),
            department: 'department',
            identityType: DocumentType.InternalPassport,
        }

        jest.spyOn(documentsService, 'getIdentityDocument').mockResolvedValueOnce(identity)

        expect(await action.handler(args)).toMatchObject(identity)
        expect(documentsService.getIdentityDocument).toHaveBeenCalledWith(args.session.user)
    })
})
