import { NotFoundError } from '@diia-inhouse/errors'
import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetPassportToProcessAction from '@actions/v1/getPassportToProcess'

import DocumentsService from '@services/documents'
import PassportService from '@services/passport'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import { idCard } from '@tests/mocks/stubs/passport'

import { Passport } from '@interfaces/providers/eis'

describe(`Action ${GetPassportToProcessAction.name}`, () => {
    const testKit = new TestKit()
    const documentsService = mockInstance(DocumentsService)
    const passportService = mockInstance(PassportService)
    const passportDataMapper = mockInstance(PassportDataMapper, { passportTypeToDocumentType: {} })
    const action = new GetPassportToProcessAction(documentsService, passportService, passportDataMapper)

    it('should throw NotFoundError if passport not found', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { handlePhoto: true },
            headers,
            session,
        }

        jest.spyOn(passportService, 'getPassportToProcess').mockResolvedValueOnce(undefined)

        await expect(action.handler(args)).rejects.toThrow(new NotFoundError('Passports not found'))
        expect(passportService.getPassportToProcess).toHaveBeenCalledWith(args.session.user)
    })

    it('should return passport id', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { handlePhoto: true },
            headers,
            session,
        }

        const passport: Passport = idCard

        jest.spyOn(passportService, 'getPassportToProcess').mockResolvedValueOnce(passport)

        expect(await action.handler(args)).toMatchObject(passport)
        expect(passportService.getPassportToProcess).toHaveBeenCalledWith(args.session.user)
    })
})
