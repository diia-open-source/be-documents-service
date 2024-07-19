import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetPassportToProcessAction from '@actions/v2/getPassportToProcess'

import DocumentsService from '@services/documents'
import PassportService from '@services/passport'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import { ForeignPassportInstance, InternalPassportInstance } from '@interfaces/providers/eis'
import { PassportDocumentType } from '@interfaces/services/passport'

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

        const passport: InternalPassportInstance = testKit.docs.generateDocument(PassportDocumentType.InternalPassport)

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

        const passport: ForeignPassportInstance = testKit.docs.generateDocument(PassportDocumentType.ForeignPassport)

        jest.spyOn(passportService, 'getPassportToProcess').mockResolvedValueOnce(passport)

        expect(await action.handler(args)).toEqual({ foreignPassport: passport })
        expect(passportService.getPassportToProcess).toHaveBeenCalledWith(args.session.user)
    })
})
