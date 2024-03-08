import { randomUUID } from 'crypto'

import Logger from '@diia-inhouse/diia-logger'
import { EventBus, InternalEvent } from '@diia-inhouse/diia-queue'
import { NotFoundError } from '@diia-inhouse/errors'
import { StoreService } from '@diia-inhouse/redis'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DurationMs, HttpStatusCode } from '@diia-inhouse/types'

import PublishAdultRegistrationAddressCommunityTask from '@src/tasks/publishAdultRegistrationAddressCommunity'

import PassportService from '@services/passport'

import { getPassportInfo, getPassportRegistrationInfo } from '@mocks/stubs'

import { EventPayload } from '@interfaces/tasks/publishAdultRegistrationAddressCommunity'

describe(`Task ${PublishAdultRegistrationAddressCommunityTask.name}`, () => {
    const testKit = new TestKit()

    const passportService = mockInstance(PassportService)
    const storeService = mockInstance(StoreService)
    const eventBus = mockInstance(EventBus)
    const logger = mockInstance(Logger)

    const task = new PublishAdultRegistrationAddressCommunityTask(passportService, storeService, eventBus, logger)

    it('should skip publish event if it was already published for given user identifier', async () => {
        const { user } = testKit.session.getUserSession()
        const { identifier: userIdentifier, itn, fName, lName, mName, birthDay, gender } = user
        const params: EventPayload = { userIdentifier, itn, fName, lName, mName, birthDay, gender }
        const eventName = InternalEvent.DocumentsAdultRegistrationAddressCommunity

        const storeGetSpy = jest.spyOn(storeService, 'get').mockResolvedValueOnce('1')
        const logInfoSpy = jest.spyOn(logger, 'info')
        const getPassportByInnSpy = jest.spyOn(passportService, 'getPassportByInn').mockClear()
        const publishSpy = jest.spyOn(eventBus, 'publish').mockClear()

        await expect(task.handler(params)).resolves.toBeUndefined()
        expect(storeGetSpy).toHaveBeenCalledWith(`${eventName}.${userIdentifier}`)
        expect(logInfoSpy).toHaveBeenCalledWith(`Skip publish [${eventName}]`)
        expect(getPassportByInnSpy).not.toHaveBeenCalled()
        expect(publishSpy).not.toHaveBeenCalled()
    })

    it.each([
        ['koatuu', { koatuu: randomUUID() }],
        ['communityKodificatorCode', { communityKodificatorCode: randomUUID() }],
        ['koatuu and communityKodificatorCode', { koatuu: randomUUID(), communityKodificatorCode: randomUUID() }],
    ])('should publish event and set record in store if payload has %s', async (_msg, paramsModifier) => {
        const { user } = testKit.session.getUserSession()
        const { identifier: userIdentifier, itn, fName, lName, mName, birthDay, gender } = user
        const params: EventPayload = { userIdentifier, itn, fName, lName, mName, birthDay, gender, ...paramsModifier }
        const eventName = InternalEvent.DocumentsAdultRegistrationAddressCommunity

        const storeGetSpy = jest.spyOn(storeService, 'get').mockResolvedValueOnce(null)
        const storeSetSpy = jest.spyOn(storeService, 'set')
        const getPassportByInnSpy = jest.spyOn(passportService, 'getPassportByInn').mockClear()
        const publishSpy = jest.spyOn(eventBus, 'publish').mockResolvedValueOnce(true)

        await expect(task.handler(params)).resolves.toBeUndefined()
        expect(storeGetSpy).toHaveBeenCalledWith(`${eventName}.${userIdentifier}`)
        expect(getPassportByInnSpy).not.toHaveBeenCalled()
        expect(publishSpy).toHaveBeenCalledWith(eventName, { userIdentifier, lName, fName, mName, birthDay, gender, ...paramsModifier })
        expect(storeSetSpy).toHaveBeenCalledWith(`${eventName}.${userIdentifier}`, '1', { ttl: DurationMs.Day })
    })

    it(`should set record and not publish event if koatuu and communityKodificatorCode was not provided and getPassportByInn throw ${HttpStatusCode.NOT_FOUND} error`, async () => {
        const { user } = testKit.session.getUserSession()
        const { identifier: userIdentifier, itn, fName, lName, mName, birthDay, gender } = user
        const params: EventPayload = { userIdentifier, itn, fName, lName, mName, birthDay, gender }
        const eventName = InternalEvent.DocumentsAdultRegistrationAddressCommunity

        const storeGetSpy = jest.spyOn(storeService, 'get').mockResolvedValueOnce(null)
        const storeSetSpy = jest.spyOn(storeService, 'set')
        const getPassportByInnSpy = jest.spyOn(passportService, 'getPassportByInn').mockRejectedValueOnce(new NotFoundError())
        const publishSpy = jest.spyOn(eventBus, 'publish').mockClear()

        await expect(task.handler(params)).resolves.toBeUndefined()
        expect(storeGetSpy).toHaveBeenCalledWith(`${eventName}.${userIdentifier}`)
        expect(getPassportByInnSpy).toHaveBeenCalledWith({ itn, lName, fName, mName })
        expect(publishSpy).not.toHaveBeenCalled()
        expect(storeSetSpy).toHaveBeenCalledWith(`${eventName}.${userIdentifier}`, '1', { ttl: DurationMs.Day })
    })

    it('should not set record and not publish event if koatuu and communityKodificatorCode was not provided and getPassportByInn throw error', async () => {
        const { user } = testKit.session.getUserSession()
        const { identifier: userIdentifier, itn, fName, lName, mName, birthDay, gender } = user
        const params: EventPayload = { userIdentifier, itn, fName, lName, mName, birthDay, gender }
        const eventName = InternalEvent.DocumentsAdultRegistrationAddressCommunity

        const storeGetSpy = jest.spyOn(storeService, 'get').mockResolvedValueOnce(null)
        const storeSetSpy = jest.spyOn(storeService, 'set').mockClear()
        const getPassportByInnSpy = jest.spyOn(passportService, 'getPassportByInn').mockRejectedValueOnce(new Error())
        const publishSpy = jest.spyOn(eventBus, 'publish').mockClear()

        await expect(task.handler(params)).resolves.toBeUndefined()
        expect(storeGetSpy).toHaveBeenCalledWith(`${eventName}.${userIdentifier}`)
        expect(getPassportByInnSpy).toHaveBeenCalledWith({ itn, lName, fName, mName })
        expect(publishSpy).not.toHaveBeenCalled()
        expect(storeSetSpy).not.toHaveBeenCalled()
    })

    it(`should set record and not publish event if koatuu and communityKodificatorCode was not provided and getPassportByInn has not returned registrationDate`, async () => {
        const { user } = testKit.session.getUserSession()
        const { identifier: userIdentifier, itn, fName, lName, mName, birthDay, gender } = user
        const params: EventPayload = { userIdentifier, itn, fName, lName, mName, birthDay, gender }
        const eventName = InternalEvent.DocumentsAdultRegistrationAddressCommunity

        const storeGetSpy = jest.spyOn(storeService, 'get').mockResolvedValueOnce(null)
        const logInfoSpy = jest.spyOn(logger, 'info')
        const storeSetSpy = jest.spyOn(storeService, 'set')
        const publishSpy = jest.spyOn(eventBus, 'publish').mockClear()
        const getPassportByInnSpy = jest.spyOn(passportService, 'getPassportByInn').mockResolvedValueOnce({
            passport: getPassportInfo(),
            registration: getPassportRegistrationInfo(),
            registrationV1: { address: { registration_inf: false } },
        })

        await expect(task.handler(params)).resolves.toBeUndefined()
        expect(storeGetSpy).toHaveBeenCalledWith(`${eventName}.${userIdentifier}`)
        expect(getPassportByInnSpy).toHaveBeenCalledWith({ itn, lName, fName, mName })
        expect(logInfoSpy).toHaveBeenCalledWith("User doesn't have registration", { userIdentifier })
        expect(storeSetSpy).toHaveBeenCalledWith(`${eventName}.${userIdentifier}`, '1', { ttl: DurationMs.Day })
        expect(publishSpy).not.toHaveBeenCalled()
    })

    it(`should set record and publish event if koatuu and communityKodificatorCode was not provided and getPassportByInn has registrationDate`, async () => {
        const { user } = testKit.session.getUserSession()
        const { identifier: userIdentifier, itn, fName, lName, mName, birthDay, gender } = user
        const params: EventPayload = { userIdentifier, itn, fName, lName, mName, birthDay, gender }
        const eventName = InternalEvent.DocumentsAdultRegistrationAddressCommunity

        const storeGetSpy = jest.spyOn(storeService, 'get').mockResolvedValueOnce(null)
        const storeSetSpy = jest.spyOn(storeService, 'set')
        const publishSpy = jest.spyOn(eventBus, 'publish').mockResolvedValueOnce(true)
        const getPassportByInnSpy = jest.spyOn(passportService, 'getPassportByInn').mockResolvedValueOnce({
            passport: getPassportInfo(),
            registrationV1: { address: { registration_inf: false } },
            registration: getPassportRegistrationInfo({
                registrationDate: new Date('22.11.2000'),
                address: { addressKoatuu: '', addressGromKatottg: 'UA80000000000093317' },
            }),
        })

        await expect(task.handler(params)).resolves.toBeUndefined()
        expect(storeGetSpy).toHaveBeenCalledWith(`${eventName}.${userIdentifier}`)
        expect(getPassportByInnSpy).toHaveBeenCalledWith({ itn, lName, fName, mName })
        expect(publishSpy).toHaveBeenCalledWith(eventName, {
            userIdentifier,
            lName,
            fName,
            mName,
            birthDay,
            gender,
            koatuu: '',
            communityKodificatorCode: 'UA80000000000093317',
        })
        expect(storeSetSpy).toHaveBeenCalledWith(`${eventName}.${userIdentifier}`, '1', { ttl: DurationMs.Day })
    })
})
