import { randomUUID } from 'crypto'

import { AnalyticsService } from '@diia-inhouse/analytics'
import { AuthService } from '@diia-inhouse/crypto'
import { EventBus, ExternalCommunicator } from '@diia-inhouse/diia-queue'
import { BadRequestError, DocumentNotFoundError, ErrorType, NotFoundError } from '@diia-inhouse/errors'
import TestKit from '@diia-inhouse/test'
import { AppUserActionHeaders, DocStatus, DocumentType, DriverLicense, Localization, UserSession, UserTokenData } from '@diia-inhouse/types'

import ShareDriverLicenseAction from '@src/documents/driverLicense/actions/v1/shareDriverLicense'
import VerifyDriverLicenseAction from '@src/documents/driverLicense/actions/v1/verifyDriverLicense'
import { DriverLicenseDocumentDTO } from '@src/documents/driverLicense/interfaces/providers/hsc'
import DriverLicenseHscProvider from '@src/documents/driverLicense/providers/hsc'
import { getDriverLicense } from '@src/documents/driverLicense/providers/hsc/mockData'

import GetDocumentsAction from '@actions/v5/getDocuments'

import UserService from '@services/user'

import { photo } from '@providers/testData/photo'

import { getPassport } from '@mocks/stubs/providers/eis/passport'

import { getApp } from '@tests/utils/getApp'

import { RegistryPassportDTO } from '@interfaces/dto'
import { DocumentTypeResponse } from '@interfaces/services/documents'

describe(`Action ${VerifyDriverLicenseAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let auth: AuthService
    let external: ExternalCommunicator
    let eventBus: EventBus
    let driverLicenseHscProvider: DriverLicenseHscProvider
    let userService: UserService
    let analytics: AnalyticsService
    let getDocumentsAction: GetDocumentsAction
    let shareDriverLicenseAction: ShareDriverLicenseAction
    let verifyDriverLicenseAction: VerifyDriverLicenseAction

    beforeAll(async () => {
        app = await getApp()

        auth = app.container.resolve<AuthService>('auth')
        external = app.container.resolve('external')
        eventBus = app.container.resolve<EventBus>('eventBus')
        driverLicenseHscProvider = app.container.resolve<DriverLicenseHscProvider>('driverLicenseHscProvider')
        userService = app.container.resolve<UserService>('userService')
        analytics = app.container.resolve<AnalyticsService>('analytics')
        getDocumentsAction = app.container.build(GetDocumentsAction)
        shareDriverLicenseAction = app.container.build(ShareDriverLicenseAction)
        verifyDriverLicenseAction = app.container.build(VerifyDriverLicenseAction)

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should return driver license', async () => {
        const sharerActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const receiverActionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const userDocumentsOrder = [{ documentType: DocumentType.DriverLicense }]
        const registryResponse = getDriverLicense()
        const expected = testKit.docs.getDriverLicense({
            id: `${registryResponse.driverLicense[0].id}`,
            shareLocalization: Localization.UA,
            photo,
        })

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense')
            .mockResolvedValueOnce(registryResponse)
            .mockResolvedValueOnce(registryResponse)
        jest.spyOn(analytics, 'log').mockReturnValue()
        jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(<UserTokenData>{
            itn: sharerActionArgs.session.user.itn,
            sessionType: sharerActionArgs.session.sessionType,
        })

        const filter = [DocumentType.DriverLicense]
        const documentResponse = await getDocumentsAction.handler({ ...sharerActionArgs, params: { filter } })
        const doc = documentResponse[<DocumentTypeResponse>'driverLicense']
        const { id: documentId } = <DriverLicense>(<unknown>doc!.data[0])

        const { link } = await shareDriverLicenseAction.handler({ ...sharerActionArgs, params: { documentId } })
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
        const userDocumentsOrder = [{ documentType: DocumentType.DriverLicense }]
        const registryResponse = getDriverLicense()
        const expected = testKit.docs.getDriverLicense({
            id: `${registryResponse.driverLicense[0].id}`,
            shareLocalization: Localization.UA,
            photo,
        })

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense')
            .mockResolvedValueOnce(registryResponse)
            .mockResolvedValueOnce(registryResponse)
        jest.spyOn(analytics, 'log').mockReturnValue()
        jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(<UserTokenData>{
            itn: sharerActionArgs.session.user.itn,
            sessionType: sharerActionArgs.session.sessionType,
        })

        const filter = [DocumentType.DriverLicense]
        const documentResponse = await getDocumentsAction.handler({ ...sharerActionArgs, params: { filter } })
        const doc = documentResponse[<DocumentTypeResponse>'driverLicense']
        const { id: documentId } = <DriverLicense>(<unknown>doc!.data[0])

        const { link } = await shareDriverLicenseAction.handler({ ...sharerActionArgs, params: { documentId } })
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
        const userDocumentsOrder = [{ documentType: DocumentType.DriverLicense }]

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
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
        const doc = documentResponse[<DocumentTypeResponse>'driverLicense']
        const { id: documentId } = <DriverLicense>(<unknown>doc!.data[0])

        const { link } = await shareDriverLicenseAction.handler({ ...sharerActionArgs, params: { documentId } })
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
        const userDocumentsOrder = [{ documentType: DocumentType.DriverLicense }]

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
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
        const doc = documentResponse[<DocumentTypeResponse>'driverLicense']
        const { id: documentId } = <DriverLicense>(<unknown>doc!.data[0])

        const { link } = await shareDriverLicenseAction.handler({ ...sharerActionArgs, params: { documentId } })
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
        const userDocumentsOrder = [{ documentType: DocumentType.DriverLicense }]
        const driverLicenseRegistryResponse = getDriverLicense({ driverLicense: [<DriverLicenseDocumentDTO>{ photo: '' }] })
        const expected = testKit.docs.getDriverLicense({
            id: `${driverLicenseRegistryResponse.driverLicense[0].id}`,
            shareLocalization: Localization.UA,
            docStatus: DocStatus.NoPhoto,
            photo: '',
        })

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())
        jest.spyOn(analytics, 'log').mockReturnValue()
        jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(<UserTokenData>{
            itn: sharerActionArgs.session.user.itn,
            sessionType: sharerActionArgs.session.sessionType,
        })
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense')
            .mockResolvedValueOnce(driverLicenseRegistryResponse)
            .mockResolvedValueOnce(driverLicenseRegistryResponse)

        const filter = [DocumentType.DriverLicense]
        const documentResponse = await getDocumentsAction.handler({ ...sharerActionArgs, params: { filter } })
        const doc = documentResponse[<DocumentTypeResponse>'driverLicense']
        const { id: documentId } = <DriverLicense>(<unknown>doc!.data[0])

        const { link } = await shareDriverLicenseAction.handler({ ...sharerActionArgs, params: { documentId } })
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
        const userDocumentsOrder = [{ documentType: DocumentType.DriverLicense }]
        const driverLicenseRegistryResponse = getDriverLicense({ driverLicense: [<DriverLicenseDocumentDTO>{ photo: '' }] })
        const passportRegistryResponse = getPassport(<RegistryPassportDTO>{ documents: [{ photo }, { photo }] })
        const { unzr } = passportRegistryResponse
        const expected = testKit.docs.getDriverLicense({
            id: `${driverLicenseRegistryResponse.driverLicense[0].id}`,
            shareLocalization: Localization.UA,
            recordNumber: unzr,
            ua: { identifier: { value: unzr } },
            eng: { identifier: { value: unzr } },
            docStatus: DocStatus.Ok,
            photo,
        })

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(analytics, 'log').mockReturnValue()
        jest.spyOn(auth, 'decodeToken').mockResolvedValueOnce(<UserTokenData>{
            itn: sharerActionArgs.session.user.itn,
            sessionType: sharerActionArgs.session.sessionType,
        })
        jest.spyOn(external, 'receiveDirect')
            .mockResolvedValueOnce(passportRegistryResponse)
            .mockResolvedValueOnce(passportRegistryResponse)
            .mockResolvedValueOnce(passportRegistryResponse)
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense')
            .mockResolvedValueOnce(driverLicenseRegistryResponse)
            .mockResolvedValueOnce(driverLicenseRegistryResponse)

        const filter = [DocumentType.DriverLicense]
        const documentResponse = await getDocumentsAction.handler({ ...sharerActionArgs, params: { filter } })
        const doc = documentResponse[<DocumentTypeResponse>'driverLicense']
        const { id: documentId } = <DriverLicense>(<unknown>doc!.data[0])

        const { link } = await shareDriverLicenseAction.handler({ ...sharerActionArgs, params: { documentId } })
        const otp = link.split('/')[7]

        const result = await verifyDriverLicenseAction.handler({
            ...(<{ session: UserSession; headers: { token: string } & AppUserActionHeaders }>receiverActionArgs),
            params: { otp },
        })

        expect(result).toEqual(expected)
    })
})
