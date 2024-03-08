import TestKit, { mockInstance } from '@diia-inhouse/test'

import GetPassports from '@actions/v1/getPassports'

import DocumentsExpirationService from '@services/documentsExpiration'
import PassportService from '@services/passport'

import { PassportFullInstance } from '@interfaces/providers/eis'

describe(`Action ${GetPassports.name}`, () => {
    const testKit = new TestKit()
    const documentsExpirationService = mockInstance(DocumentsExpirationService)
    const passportService = mockInstance(PassportService)
    const action = new GetPassports(documentsExpirationService, passportService)

    it('should return passport id', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            headers,
            session,
        }

        const data = [<PassportFullInstance>(<unknown>testKit.docs.getForeignPassport())]

        const currentDate: string = new Date().toISOString()
        const expirationDate: string = new Date(Date.now() * 1000).toISOString()
        const expResult = { currentDate, expirationDate }
        const result = { data, ...expResult }

        jest.spyOn(passportService, 'getPassportFull').mockResolvedValueOnce({ data })
        jest.spyOn(documentsExpirationService, 'generateMetaData').mockReturnValueOnce(expResult)

        expect(await action.handler(args)).toMatchObject(result)
        expect(passportService.getPassportFull).toHaveBeenCalledWith(args.session.user)
        expect(documentsExpirationService.generateMetaData).toHaveBeenCalledWith()
    })
})
