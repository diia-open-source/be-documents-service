import { randomUUID } from 'crypto'

import * as uuid from 'uuid'

import { EventBus } from '@diia-inhouse/diia-queue'
import { AccessDeniedError, DocumentNotFoundError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import { DocumentType, DriverLicense, DurationMs } from '@diia-inhouse/types'

import ShareDriverLicenseAction from '@src/documents/driverLicense/actions/v1/shareDriverLicense'
import { DriverLicenseDocumentDTO } from '@src/documents/driverLicense/interfaces/providers/hsc'
import DriverLicenseHscProvider from '@src/documents/driverLicense/providers/hsc'
import { getDriverLicense } from '@src/documents/driverLicense/providers/hsc/mockData'

import GetDocumentsAction from '@actions/v5/getDocuments'

import UserService from '@services/user'

import documentsExpirationModel from '@models/documentsExpiration'

import { getApp } from '@tests/utils/getApp'

import { DocumentTypeResponse } from '@interfaces/services/documents'
import { ShareLinkResponse } from '@interfaces/services/documentVerification'

jest.mock('uuid', () => ({
    v4: jest.fn(() => randomUUID()),
}))

describe(`Action ${ShareDriverLicenseAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: ShareDriverLicenseAction
    let getDocumentsAction: GetDocumentsAction
    let eventBus: EventBus
    let driverLicenseHscProvider: DriverLicenseHscProvider
    let userService: UserService

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(ShareDriverLicenseAction)
        getDocumentsAction = app.container.build(GetDocumentsAction)
        eventBus = app.container.resolve<EventBus>('eventBus')
        driverLicenseHscProvider = app.container.resolve<DriverLicenseHscProvider>('driverLicenseHscProvider')
        userService = app.container.resolve<UserService>('userService')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should generate share response', async () => {
        const { session, headers } = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder = [{ documentType: DocumentType.DriverLicense }]
        const hash = randomUUID()

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense')
            .mockResolvedValueOnce(getDriverLicense())
            .mockResolvedValueOnce(getDriverLicense())

        const documentResponse = await getDocumentsAction.handler({
            session,
            headers,
            params: { filter: [DocumentType.DriverLicense] },
        })
        const driverLicense = documentResponse[<DocumentTypeResponse>'driverLicense']
        const { id: documentId, serial: serie, number } = <DriverLicense>(<unknown>driverLicense!.data[0])
        const params = { documentId, serie, number }

        jest.spyOn(uuid, 'v4').mockReturnValueOnce(hash)

        const result = await action.handler({ session, headers, params })

        expect(result).toEqual<ShareLinkResponse>({
            barcode: expect.any(String),
            id: expect.any(String),
            link: `https://diia.app/documents/${DocumentType.DriverLicense}/${documentId}/verify/${hash}`,
            timerText: expect.any(String),
            timerTime: 180,
        })
    })

    it('should generate share response if document expired', async () => {
        const { session, headers } = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder = [{ documentType: DocumentType.DriverLicense }]
        const { user } = session
        const { identifier: userIdentifier } = user
        const { mobileUid } = headers
        const hash = randomUUID()

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense')
            .mockResolvedValueOnce(getDriverLicense())
            .mockResolvedValueOnce(getDriverLicense())

        const documentResponse = await getDocumentsAction.handler({
            session,
            headers,
            params: { filter: [DocumentType.DriverLicense] },
        })
        const driverLicense = documentResponse[<DocumentTypeResponse>'driverLicense']
        const { id: documentId, serial: serie, number } = <DriverLicense>(<unknown>driverLicense!.data[0])
        const params = { documentId, serie, number }

        await documentsExpirationModel.updateOne(
            { userIdentifier, mobileUid },
            { [`${DocumentType.DriverLicense}.date`]: new Date(Date.now() - DurationMs.Hour) },
        )

        jest.spyOn(uuid, 'v4').mockReturnValueOnce(hash)

        const result = await action.handler({ session, headers, params })

        expect(result).toEqual<ShareLinkResponse>({
            barcode: expect.any(String),
            id: expect.any(String),
            link: `https://diia.app/documents/${DocumentType.DriverLicense}/${documentId}/verify/${hash}`,
            timerText: expect.any(String),
            timerTime: 180,
        })
    })

    it('should throw error if document was not found', async () => {
        const { session, headers } = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder = [{ documentType: DocumentType.DriverLicense }]
        const { user } = session
        const { identifier: userIdentifier } = user
        const { mobileUid } = headers

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense')
            .mockResolvedValueOnce(getDriverLicense())
            .mockResolvedValueOnce({ ...getDriverLicense(), driverLicense: [] })

        const documentResponse = await getDocumentsAction.handler({
            session,
            headers,
            params: { filter: [DocumentType.DriverLicense] },
        })
        const driverLicense = documentResponse[<DocumentTypeResponse>'driverLicense']
        const { id: documentId, serial: serie, number } = <DriverLicense>(<unknown>driverLicense!.data[0])
        const params = { documentId, serie, number }

        await documentsExpirationModel.updateOne(
            { userIdentifier, mobileUid },
            { [`${DocumentType.DriverLicense}.date`]: new Date(Date.now() - DurationMs.Hour) },
        )

        await expect(action.handler({ session, headers, params })).rejects.toThrow(new AccessDeniedError())
    })

    it('should throw error if document id does not match', async () => {
        const { session, headers } = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder = [{ documentType: DocumentType.DriverLicense }]
        const { user } = session
        const { identifier: userIdentifier } = user
        const { mobileUid } = headers

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense')
            .mockResolvedValueOnce(getDriverLicense())
            .mockResolvedValueOnce(getDriverLicense({ driverLicense: [<DriverLicenseDocumentDTO>{ id: 52511147 }] }))

        const documentResponse = await getDocumentsAction.handler({
            session,
            headers,
            params: { filter: [DocumentType.DriverLicense] },
        })
        const driverLicense = documentResponse[<DocumentTypeResponse>'driverLicense']
        const { id: documentId, serial: serie, number } = <DriverLicense>(<unknown>driverLicense!.data[0])
        const params = { documentId, serie, number }

        await documentsExpirationModel.updateOne(
            { userIdentifier, mobileUid },
            { [`${DocumentType.DriverLicense}.date`]: new Date(Date.now() - DurationMs.Hour) },
        )

        await expect(action.handler({ session, headers, params })).rejects.toThrow(
            new DocumentNotFoundError(`There is no driver license document with id ${documentId}`),
        )
    })
})
