import { randomUUID } from 'crypto'

import { ObjectId } from 'bson'

import { MoleculerService } from '@diia-inhouse/diia-app'

import DiiaLogger from '@diia-inhouse/diia-logger'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { ActionVersion } from '@diia-inhouse/types'

import NotificationService from '@services/notification'

describe(`Service ${NotificationService.name}`, () => {
    const testKit = new TestKit()
    const moleculerService = mockInstance(MoleculerService)
    const diiaLogger = mockInstance(DiiaLogger)
    const service = new NotificationService(moleculerService, diiaLogger)
    const { user } = testKit.session.getUserSession()

    describe(`method: ${service.createNotificationWithPushesByMobileUid.name}`, () => {
        it('should return notification by resource type', async () => {
            const params = {
                mobileUid: randomUUID(),
                templateCode: 'template-code',
                userIdentifier: user.identifier,
            }

            const notificationByResourceType = {
                _id: new ObjectId(),
                hashId: randomUUID(),
                userIdentifier: user.identifier,
                isRead: false,
                isDeleted: false,
            }

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(notificationByResourceType)

            expect(await service.createNotificationWithPushesByMobileUid(params)).toMatchObject(notificationByResourceType)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'Notification',
                { name: 'createNotificationWithPushesByMobileUid', actionVersion: ActionVersion.V1 },
                { params },
            )
        })
    })

    describe(`method ${service.createNotificationWithPushesByMobileUidSafe.name}`, () => {
        it('should return notification by resource type', async () => {
            const params = {
                mobileUid: randomUUID(),
                templateCode: 'template-code',
                userIdentifier: user.identifier,
            }

            const notificationByResourceType = {
                _id: new ObjectId(),
                hashId: randomUUID(),
                userIdentifier: user.identifier,
                isRead: false,
                isDeleted: false,
            }

            jest.spyOn(moleculerService, 'act').mockResolvedValueOnce(notificationByResourceType)

            expect(await service.createNotificationWithPushesByMobileUidSafe(params)).toBe(notificationByResourceType)
            expect(moleculerService.act).toHaveBeenCalledWith(
                'Notification',
                { name: 'createNotificationWithPushesByMobileUid', actionVersion: ActionVersion.V1 },
                { params },
            )
        })

        it('should fail execution if error occurred during request', async () => {
            const err = new Error('err')

            const params = {
                mobileUid: randomUUID(),
                templateCode: 'template-code',
                userIdentifier: user.identifier,
            }

            jest.spyOn(moleculerService, 'act').mockRejectedValueOnce(err)

            expect(await service.createNotificationWithPushesByMobileUidSafe(params)).toBeUndefined()
            expect(diiaLogger.fatal).toHaveBeenCalledWith('Failed to exec createNotificationWithPushesByMobileUid', { err, params })
        })
    })
})
