import { randomUUID } from 'node:crypto'

import { AnalyticsService } from '@diia-inhouse/analytics'
import { AuthService } from '@diia-inhouse/crypto'
import { EventBus, ExternalCommunicator } from '@diia-inhouse/diia-queue'
import { BadRequestError, DocumentNotFoundError, ErrorType, NotFoundError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import { AppUserActionHeaders, DocStatus, Localization, UserSession, UserTokenData } from '@diia-inhouse/types'
import { DocumentOrderSettingsItem, UserServiceClient } from '@diia-inhouse/user-service-client'

import ShareDocumentAction from '@src/actions/v1/shareDocument'
import VerifyDriverLicenseAction from '@src/documents/driverLicense/actions/v1/verifyDriverLicense'
import { DriverLicenseDocumentDTO } from '@src/documents/driverLicense/interfaces/providers/hsc'
import { DocumentType, DocumentTypeCamelCase, DriverLicense } from '@src/documents/driverLicense/interfaces/services'
import DriverLicenseHscProvider from '@src/documents/driverLicense/providers/hsc'
import { getDriverLicense } from '@src/documents/driverLicense/providers/hsc/mockData'

import GetDocumentsAction from '@actions/v5/getDocuments'

import UserService from '@services/user'

import { photo } from '@providers/testData/photo'

import { getPassport } from '@mocks/stubs/providers/eis/passport'

import { getApp } from '@tests/utils/getApp'

import { RegistryPassportDTO } from '@interfaces/dto'
import { DocumentResponse } from '@interfaces/services/documents'

describe(`Action ${VerifyDriverLicenseAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let auth: AuthService
    let external: ExternalCommunicator
    let eventBus: EventBus
    let driverLicenseHscProvider: DriverLicenseHscProvider
    let userService: UserService
    let userServiceClient: UserServiceClient
    let analytics: AnalyticsService
    let getDocumentsAction: GetDocumentsAction
    let shareDocumentAction: ShareDocumentAction
    let verifyDriverLicenseAction: VerifyDriverLicenseAction

    beforeAll(async () => {
        app = await getApp()

        auth = app.container.resolve<AuthService>('auth')
        external = app.container.resolve('external')
        eventBus = app.container.resolve<EventBus>('eventBus')
        driverLicenseHscProvider = app.container.resolve<DriverLicenseHscProvider>('driverLicenseHscProvider')
        userService = app.container.resolve<UserService>('userService')
        userServiceClient = app.container.resolve<UserServiceClient>('userServiceClient')
        analytics = app.container.resolve<AnalyticsService>('analytics')
        getDocumentsAction = app.container.build(GetDocumentsAction)
        shareDocumentAction = app.container.build(ShareDocumentAction)
        verifyDriverLicenseAction = app.container.build(VerifyDriverLicenseAction)

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should return driver license', async () => {
        const sharerActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const receiverActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder: DocumentOrderSettingsItem[] = [{ documentType: DocumentType.DriverLicense, documentIdentifiers: [] }]
        const registryResponse = getDriverLicense()
        const expected = <DriverLicense>testKit.docs.generateDocument(DocumentType.DriverLicense, {
            id: `${registryResponse.driverLicense[0].id}`,
            shareLocalization: Localization.UA,
            photo,
        })

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: userDocumentsOrder,
            documentVisibilitySettings: [],
        })
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValue(registryResponse)
        jest.spyOn(analytics, 'log').mockReturnValue()
        jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(<UserTokenData>{
            itn: sharerActionArgs.session.user.itn,
            sessionType: sharerActionArgs.session.sessionType,
        })

        const filter = [DocumentType.DriverLicense]
        const documentResponse = await getDocumentsAction.handler({ ...sharerActionArgs, params: { filter } })
        const doc = <DocumentResponse<DriverLicense>>(<unknown>documentResponse[DocumentTypeCamelCase.DriverLicense])
        const { id: documentId } = doc.data[0]

        const { link } = await shareDocumentAction.handler({
            ...sharerActionArgs,
            params: { documentType: DocumentType.DriverLicense, documentId },
        })
        const otp = link.split('/')[7]

        const result = await verifyDriverLicenseAction.handler({
            ...(<{ session: UserSession; headers: { token: string } & AppUserActionHeaders }>receiverActionArgs),
            params: { otp },
        })

        expect(result).toEqual(expected)
    })

    it('should return driver license when passport is not found', async () => {
        const sharerActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const receiverActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder: DocumentOrderSettingsItem[] = [{ documentType: DocumentType.DriverLicense, documentIdentifiers: [] }]
        const registryResponse = getDriverLicense()
        const expected = <DriverLicense>testKit.docs.generateDocument(DocumentType.DriverLicense, {
            id: `${registryResponse.driverLicense[0].id}`,
            shareLocalization: Localization.UA,
            photo,
        })

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: userDocumentsOrder,
            documentVisibilitySettings: [],
        })
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValue(registryResponse)
        jest.spyOn(analytics, 'log').mockReturnValue()
        jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(<UserTokenData>{
            itn: sharerActionArgs.session.user.itn,
            sessionType: sharerActionArgs.session.sessionType,
        })

        const filter = [DocumentType.DriverLicense]
        const documentResponse = await getDocumentsAction.handler({ ...sharerActionArgs, params: { filter } })
        const doc = <DocumentResponse<DriverLicense>>(<unknown>documentResponse[DocumentTypeCamelCase.DriverLicense])
        const { id: documentId } = doc.data[0]

        const { link } = await shareDocumentAction.handler({
            ...sharerActionArgs,
            params: { documentType: DocumentType.DriverLicense, documentId },
        })
        const otp = link.split('/')[7]

        const result = await verifyDriverLicenseAction.handler({
            ...(<{ session: UserSession; headers: { token: string } & AppUserActionHeaders }>receiverActionArgs),
            params: { otp },
        })

        expect(result).toEqual(expected)
    })

    it('should throw error if no otp was found', async () => {
        const receiverActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const otp = randomUUID()

        await expect(
            verifyDriverLicenseAction.handler({
                ...(<{ session: UserSession; headers: { token: string } & AppUserActionHeaders }>receiverActionArgs),
                params: { otp },
            }),
        ).rejects.toThrow(new NotFoundError('VerificationOtp is not found'))
    })

    it('should throw error if driver license response is incorrect', async () => {
        const sharerActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const receiverActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder: DocumentOrderSettingsItem[] = [{ documentType: DocumentType.DriverLicense, documentIdentifiers: [] }]

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: userDocumentsOrder,
            documentVisibilitySettings: [],
        })
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense')
            .mockResolvedValueOnce(getDriverLicense())
            .mockRejectedValueOnce(new DocumentNotFoundError('Driver license was not found in registry by provided itn'))
        jest.spyOn(analytics, 'log').mockReturnValue()
        jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(<UserTokenData>{
            itn: sharerActionArgs.session.user.itn,
            sessionType: sharerActionArgs.session.sessionType,
        })

        const filter = [DocumentType.DriverLicense]
        const documentResponse = await getDocumentsAction.handler({ ...sharerActionArgs, params: { filter } })
        const doc = <DocumentResponse<DriverLicense>>(<unknown>documentResponse[DocumentTypeCamelCase.DriverLicense])
        const { id: documentId } = doc.data[0]

        const { link } = await shareDocumentAction.handler({
            ...sharerActionArgs,
            params: { documentType: DocumentType.DriverLicense, documentId },
        })
        const otp = link.split('/')[7]

        await expect(
            verifyDriverLicenseAction.handler({
                ...(<{ session: UserSession; headers: { token: string } & AppUserActionHeaders }>receiverActionArgs),
                params: { otp },
            }),
        ).rejects.toThrow(
            new DocumentNotFoundError('Driver license was not found in registry by provided itn', undefined, ErrorType.Operated),
        )
    })

    it('should throw error if driver license was not found', async () => {
        const sharerActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const receiverActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder: DocumentOrderSettingsItem[] = [{ documentType: DocumentType.DriverLicense, documentIdentifiers: [] }]

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: userDocumentsOrder,
            documentVisibilitySettings: [],
        })
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(analytics, 'log').mockReturnValue()
        jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(<UserTokenData>{
            itn: sharerActionArgs.session.user.itn,
            sessionType: sharerActionArgs.session.sessionType,
        })
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense')
            .mockResolvedValueOnce(getDriverLicense())
            .mockResolvedValueOnce({ ...getDriverLicense(), driverLicense: [] })

        const filter = [DocumentType.DriverLicense]
        const documentResponse = await getDocumentsAction.handler({ ...sharerActionArgs, params: { filter } })
        const doc = <DocumentResponse<DriverLicense>>(<unknown>documentResponse[DocumentTypeCamelCase.DriverLicense])
        const { id: documentId } = doc.data[0]

        const { link } = await shareDocumentAction.handler({
            ...sharerActionArgs,
            params: { documentType: DocumentType.DriverLicense, documentId },
        })
        const otp = link.split('/')[7]

        await expect(
            verifyDriverLicenseAction.handler({
                ...(<{ session: UserSession; headers: { token: string } & AppUserActionHeaders }>receiverActionArgs),
                params: { otp },
            }),
        ).rejects.toThrow(new BadRequestError('DriverLicense is not found'))
    })

    it('should try to extract photo from passport if driver license has no photo', async () => {
        const sharerActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const receiverActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder: DocumentOrderSettingsItem[] = [{ documentType: DocumentType.DriverLicense, documentIdentifiers: [] }]
        const driverLicenseRegistryResponse = getDriverLicense({ driverLicense: [<DriverLicenseDocumentDTO>{ photo: '' }] })
        const expected = <DriverLicense>testKit.docs.generateDocument(DocumentType.DriverLicense, {
            id: `${driverLicenseRegistryResponse.driverLicense[0].id}`,
            shareLocalization: Localization.UA,
            docStatus: DocStatus.NoPhoto,
            photo: '',
        })

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: userDocumentsOrder,
            documentVisibilitySettings: [],
        })
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())
        jest.spyOn(analytics, 'log').mockReturnValue()
        jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(<UserTokenData>{
            itn: sharerActionArgs.session.user.itn,
            sessionType: sharerActionArgs.session.sessionType,
        })
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValue(driverLicenseRegistryResponse)

        const filter = [DocumentType.DriverLicense]
        const documentResponse = await getDocumentsAction.handler({ ...sharerActionArgs, params: { filter } })
        const doc = <DocumentResponse<DriverLicense>>(<unknown>documentResponse[DocumentTypeCamelCase.DriverLicense])
        const { id: documentId } = doc.data[0]

        const { link } = await shareDocumentAction.handler({
            ...sharerActionArgs,
            params: { documentType: DocumentType.DriverLicense, documentId },
        })
        const otp = link.split('/')[7]

        const result = await verifyDriverLicenseAction.handler({
            ...(<{ session: UserSession; headers: { token: string } & AppUserActionHeaders }>receiverActionArgs),
            params: { otp },
        })

        expect(result).toEqual(expected)
    })

    it('should extract photo from passport if driver license has no photo', async () => {
        const sharerActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const receiverActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder: DocumentOrderSettingsItem[] = [{ documentType: DocumentType.DriverLicense, documentIdentifiers: [] }]
        const driverLicenseRegistryResponse = getDriverLicense({ driverLicense: [<DriverLicenseDocumentDTO>{ photo: '' }] })
        const passportRegistryResponse = getPassport(<RegistryPassportDTO>{ documents: [{ photo }, { photo }] })
        const { unzr } = passportRegistryResponse
        const expected = <DriverLicense>testKit.docs.generateDocument(DocumentType.DriverLicense, {
            id: `${driverLicenseRegistryResponse.driverLicense[0].id}`,
            shareLocalization: Localization.UA,
            recordNumber: unzr,
            ua: { identifier: { value: unzr } },
            eng: { identifier: { value: unzr } },
            docStatus: DocStatus.Ok,
            photo,
        })

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: userDocumentsOrder,
            documentVisibilitySettings: [],
        })
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(analytics, 'log').mockReturnValue()
        jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(<UserTokenData>{
            itn: sharerActionArgs.session.user.itn,
            sessionType: sharerActionArgs.session.sessionType,
        })
        jest.spyOn(external, 'receiveDirect').mockResolvedValue(passportRegistryResponse)
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValue(driverLicenseRegistryResponse)

        const filter = [DocumentType.DriverLicense]
        const documentResponse = await getDocumentsAction.handler({ ...sharerActionArgs, params: { filter } })
        const doc = <DocumentResponse<DriverLicense>>(<unknown>documentResponse[DocumentTypeCamelCase.DriverLicense])
        const { id: documentId } = doc.data[0]

        const { link } = await shareDocumentAction.handler({
            ...sharerActionArgs,
            params: { documentType: DocumentType.DriverLicense, documentId },
        })
        const otp = link.split('/')[7]

        const result = await verifyDriverLicenseAction.handler({
            ...(<{ session: UserSession; headers: { token: string } & AppUserActionHeaders }>receiverActionArgs),
            params: { otp },
        })

        expect(result).toEqual(expected)
    })
})
