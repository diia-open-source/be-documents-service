import TestKit, { mockInstance } from '@diia-inhouse/test'

import CheckPassportAction from '@actions/v1/checkPassport'

import DocumentsService from '@services/documents'
import PassportService from '@services/passport'

import PassportDataMapper from '@dataMappers/passportDataMapper'

describe(`Action ${CheckPassportAction.name}`, () => {
    const testKit = new TestKit()
    const documentsServiceMock = mockInstance(DocumentsService)
    const passportServiceMock = mockInstance(PassportService)
    const passportDataMapper = mockInstance(PassportDataMapper, { passportTypeToDocumentType: {} })
    const action = new CheckPassportAction(documentsServiceMock, passportServiceMock, passportDataMapper)

    it('should return true if found passport', async () => {
        const { session, headers } = testKit.session.getUserActionArguments()
        const args = {
            params: { handlePhoto: true },
            session,
            headers,
        }

        const mockPassport = testKit.docs.getInternalPassport()

        jest.spyOn(passportServiceMock, 'getPassportToProcess').mockResolvedValueOnce(mockPassport)
        jest.spyOn(documentsServiceMock, 'handlePhotoForDocumentToProcess').mockResolvedValueOnce()

        expect(await action.handler(args)).toMatchObject({ exists: true })
        expect(passportServiceMock.getPassportToProcess).toHaveBeenCalledWith(args.session.user)
        expect(documentsServiceMock.handlePhotoForDocumentToProcess).toHaveBeenCalledWith(session.user.identifier, undefined, mockPassport)
    })
})
