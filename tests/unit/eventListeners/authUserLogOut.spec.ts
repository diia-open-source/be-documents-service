import TestKit, { mockInstance } from '@diia-inhouse/test'

import AuthUserLogOutEventListener from '@src/eventListeners/authUserLogOut'

import DocumentsExpirationService from '@services/documentsExpiration'

describe('AuthUserLogOutEventListener', () => {
    const documentsExpirationServiceMock = mockInstance(DocumentsExpirationService)
    const authUserLogOutEventListener = new AuthUserLogOutEventListener(documentsExpirationServiceMock)
    const testKit = new TestKit()
    const {
        user: { identifier },
    } = testKit.session.getUserSession()

    it('should call documentsExpirationsService', async () => {
        const eventPayload = {
            userIdentifier: identifier,
            mobileUid: 'mobileUid',
        }

        await expect(authUserLogOutEventListener.handler(eventPayload)).resolves.toBeUndefined()

        expect(documentsExpirationServiceMock.removeUserExpirationsByMobileUid).toHaveBeenCalledWith(
            eventPayload.mobileUid,
            eventPayload.userIdentifier,
        )
    })
})
