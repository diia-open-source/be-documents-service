import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetPassportToProcessAction from '@actions/v2/getPassportToProcess'

import DocumentsService from '@services/documents'
import PassportService from '@services/passport'

import PassportDataMapper from '@dataMappers/passportDataMapper'

describe(`Action ${GetPassportToProcessAction.name}`, () => {
    const testKit = new TestKit()
    const documentsService = mockInstance(DocumentsService)
    const passportService = mockInstance(PassportService)
    const passportDataMapper = mockInstance(PassportDataMapper, { passportTypeToDocumentType: {} })
    const action = new GetPassportToProcessAction(documentsService, passportService, passportDataMapper)

    it('should return id passport', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { handlePhoto: true },
            headers,
            session,
        }

        const passport = testKit.docs.getInternalPassport()

        jest.spyOn(passportService, 'getPassportToProcess').mockResolvedValueOnce(passport)

        expect(await action.handler(args)).toEqual({ internalPassport: passport })
        expect(passportService.getPassportToProcess).toHaveBeenCalledWith(args.session.user)
    })

    it('should return foreign passport', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { handlePhoto: true },
            headers,
            session,
        }

        const passport = testKit.docs.getForeignPassport()

        jest.spyOn(passportService, 'getPassportToProcess').mockResolvedValueOnce(passport)

        expect(await action.handler(args)).toEqual({ foreignPassport: passport })
        expect(passportService.getPassportToProcess).toHaveBeenCalledWith(args.session.user)
    })
})
