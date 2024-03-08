import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { DocumentType, SessionType } from '@diia-inhouse/types'

import GetIdentityDocumentAction from '@src/actions/v2/getIdentityDocument'

import DocumentsService from '@services/documents'
import UserService from '@services/user'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v2/getIdentityDocument'
import { PassportType } from '@interfaces/dto'

describe(`Action ${GetIdentityDocumentAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let documentsService: DocumentsService
    let getIdentityDocumentAction: GetIdentityDocumentAction
    let external: ExternalCommunicator
    let userService: UserService

    beforeAll(async () => {
        app = await getApp()

        getIdentityDocumentAction = app.container.build(GetIdentityDocumentAction)
        documentsService = app.container.resolve<DocumentsService>('documentsService')
        external = app.container.resolve('external')
        userService = app.container.resolve<UserService>('userService')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it(`should return identity document for user with session type ${SessionType.User} when presented`, async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()

        jest.spyOn(userService, 'hasDocuments').mockResolvedValueOnce({
            hasDocuments: false,
            missingDocumnets: [],
        })
        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())

        // Act
        const result = await getIdentityDocumentAction.handler({ session, headers })

        // Assert
        expect(result).toEqual<ActionResult>({
            identityDocument: expect.objectContaining({
                identityType: DocumentType.InternalPassport,
                type: PassportType.ID,
            }),
        })
    })

    it('should not return identity document when not presented', async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const session = testKit.session.getUserSession()

        jest.spyOn(userService, 'hasDocuments').mockResolvedValueOnce({
            hasDocuments: false,
            missingDocumnets: [...documentsService.identityDocumentTypes],
        })

        // Act
        const result = await getIdentityDocumentAction.handler({ session, headers })

        // Assert
        expect(result).toEqual<ActionResult>({})
    })
})
