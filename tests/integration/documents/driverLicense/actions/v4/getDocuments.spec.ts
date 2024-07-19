import { when } from 'jest-when'
import { PartialDeep } from 'type-fest'

import { IdentifierService } from '@diia-inhouse/crypto'
import { EventBus, ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { DocStatus, HttpStatusCode, OwnerType } from '@diia-inhouse/types'
import { GetUserDocumentSettingsReq, UserServiceClient } from '@diia-inhouse/user-service-client'

import { DriverLicenseHscServiceProvider } from '@src/documents/driverLicense/interfaces/providers'
import { RegistryDriverLicenseDTO } from '@src/documents/driverLicense/interfaces/providers/hsc'
import { DocumentType, DriverLicense } from '@src/documents/driverLicense/interfaces/services'
import { getDriverLicense } from '@src/documents/driverLicense/providers/hsc/mockData'

import GetDocumentsAction from '@actions/v4/getDocuments'

import DocumentsService from '@services/documents'
import UserService from '@services/user'

import { idCard } from '@mocks/stubs/passport'
import photo from '@mocks/stubs/photo'
import { getPassport } from '@mocks/stubs/providers/eis/passport'

import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v4/getDocuments'
import { InternalEvent } from '@interfaces/queue'
import { CommonDocument, DocumentWithCover } from '@interfaces/services/documents'
import { GetUserDocumentsParams, GetUserDocumentsResult, UserProfileAddDocumentsMessage } from '@interfaces/services/user'

describe(`Action ${GetDocumentsAction.name}`, () => {
    process.env.IS_DOCUMENTS_EXPIRATION_ENABLED = 'true'

    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let getDocumentsAction: GetDocumentsAction
    let external: ExternalCommunicator
    let eventBus: EventBus
    let identifier: IdentifierService
    let driverLicenseHscProvider: DriverLicenseHscServiceProvider
    let userService: UserService
    let userServiceClient: UserServiceClient
    let documentsService: DocumentsService

    const getDriverLicenseWithCover = (data: PartialDeep<DriverLicense> = {}): DocumentWithCover => {
        const document = <DriverLicense>testKit.docs.generateDocument(DocumentType.DriverLicense, data)

        return {
            id: document.id,
            docStatus: document.docStatus,
            document,
        }
    }

    beforeAll(async () => {
        app = await getApp()

        await app.start()

        getDocumentsAction = app.container.build(GetDocumentsAction)
        driverLicenseHscProvider = app.container.resolve<DriverLicenseHscServiceProvider>('driverLicenseHscProvider')
        documentsService = app.container.resolve<DocumentsService>('documentsService')
        userService = app.container.resolve<UserService>('userService')
        userServiceClient = app.container.resolve<UserServiceClient>('userServiceClient')
        eventBus = app.container.resolve<EventBus>('eventBus')
        identifier = app.container.resolve('identifier')!
        external = app.container.resolve('external')
    })

    afterAll(async () => {
        await app.stop()
    })

    it(`should return ${DocumentType.DriverLicense} documents when exists`, async () => {
        // Arrange
        const documentType = DocumentType.DriverLicense
        const docTypeResponse = documentsService.documentTypeToDocumentTypeResponse[documentType]!
        const { headers, session } = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const expectedDocument = getDriverLicenseWithCover({ id: expect.any(String) })
        const { id, docStatus, document } = expectedDocument
        const { user } = session
        const { identifier: userIdentifier } = user
        const { docNumber } = <CommonDocument>document

        const getUserDocumentSettingsSpy = jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: [{ documentType: DocumentType.DriverLicense, documentIdentifiers: [] }],
            documentVisibilitySettings: [],
        })

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getUserDocumentsV1').mockResolvedValueOnce({
            documents: [
                {
                    documentType,
                    ownerType: OwnerType.owner,
                    documentIdentifier: identifier.createIdentifier(docNumber),
                },
            ],
        })
        jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(
            getDriverLicense(<RegistryDriverLicenseDTO>(<unknown>{ driverLicense: [{ photo }] })),
        )
        when(jest.spyOn(eventBus, 'publish'))
            .expectCalledWith(InternalEvent.DocumentsAddDocumentsInProfile, <UserProfileAddDocumentsMessage>{
                documents: [
                    expect.objectContaining({
                        docId: id,
                        docStatus,
                        documentIdentifier: identifier.createIdentifier(docNumber),
                        ownerType: OwnerType.owner,
                    }),
                ],
                documentType,
                headers,
                removeMissingDocuments: false,
                userIdentifier,
            })
            .mockImplementationOnce(async () => true)

        // Act
        const result = await getDocumentsAction.handler({ headers, session, params: { filter: [documentType] } })

        // Assert
        expect(getUserDocumentSettingsSpy).toHaveBeenCalledWith<GetUserDocumentSettingsReq[]>({
            userIdentifier,
            features: [],
            documentsDefaultOrder: expect.any(Object),
        })
        expect(result).toMatchObject<ActionResult>({
            [docTypeResponse]: {
                status: HttpStatusCode.OK,
                data: [expectedDocument],
                currentDate: expect.any(String),
                expirationDate: expect.any(String),
            },
            documentsTypeOrder: expect.any(Array),
        })
    })

    it('should return document with cover', async () => {
        // Arrange
        const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const { recordNumber } = idCard
        const driverLicensesRegistryResponse = getDriverLicense()
        const expectedDriverLicense = getDriverLicenseWithCover({
            id: `${driverLicensesRegistryResponse.driverLicense[0].id}`,
            recordNumber,
            ua: { identifier: { value: recordNumber } },
            eng: { identifier: { value: recordNumber } },
        })

        jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: [{ documentType: DocumentType.DriverLicense, documentIdentifiers: [] }],
            documentVisibilitySettings: [],
        })
        jest.spyOn(eventBus, 'publish').mockResolvedValue(true)
        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())
        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce({
            ...driverLicensesRegistryResponse,
            driverLicense: [
                {
                    ...driverLicensesRegistryResponse.driverLicense[0],
                    categories: [],
                },
            ],
        })
        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getUserDocumentsV1').mockImplementation(
            async ({ documentType }: GetUserDocumentsParams): Promise<GetUserDocumentsResult> => {
                return <GetUserDocumentsResult>{
                    documents: [
                        {
                            documentType,
                            ownerType: OwnerType.owner,
                            documentIdentifier: identifier.createIdentifier(<string>expectedDriverLicense.document?.docNumber),
                            docId: expectedDriverLicense.id,
                            docStatus: expectedDriverLicense.docStatus,
                        },
                    ],
                }
            },
        )

        // Act
        const result = await getDocumentsAction.handler({ ...actionArgs, params: { filter: [DocumentType.DriverLicense] } })

        // Assert
        expect(result).toMatchObject<ActionResult>({
            [documentsService.documentTypeToDocumentTypeResponse[DocumentType.DriverLicense]!]: {
                status: HttpStatusCode.OK,
                data: [
                    {
                        id: expectedDriverLicense.id,
                        docStatus: DocStatus.AdditionalVerification,
                        cover: {
                            title: 'Документ потребує верифікації 😔',
                            text: 'Перейдіть до кабінету водія та заповніть онлайн-форму.',
                            actionButton: {
                                name: 'До кабінету водія',
                                action: 'toDriverAccount',
                            },
                        },
                        document: expect.objectContaining({
                            docStatus: DocStatus.AdditionalVerification,
                            categories: '',
                            categoriesFull: [],
                        }),
                    },
                ],
                currentDate: expect.any(String),
                expirationDate: expect.any(String),
            },
            documentsTypeOrder: ['driverLicense'],
        })
    })
})
