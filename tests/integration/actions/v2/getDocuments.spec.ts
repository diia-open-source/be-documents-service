import { when } from 'jest-when'

import { IdentifierService } from '@diia-inhouse/crypto'
import { EventBus, ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { HttpStatusCode, OwnerType } from '@diia-inhouse/types'
import { DocumentOrderSettingsItem, GetUserDocumentSettingsReq, UserServiceClient } from '@diia-inhouse/user-service-client'

import GetDocumentsAction from '@actions/v2/getDocuments'

import DocumentsService from '@services/documents'
import DocumentsExpirationService from '@services/documentsExpiration'
import UserService from '@services/user'

import { idCard } from '@tests/mocks/stubs/passport'
import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v2/getDocuments'
import { InternalEvent } from '@interfaces/queue'
import { PassportDocumentType, PassportDocumentTypeCamelCase } from '@interfaces/services/passport'
import { UserProfileAddDocumentsMessage } from '@interfaces/services/user'

describe(`Action ${GetDocumentsAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let getDocumentsAction: GetDocumentsAction
    let external: ExternalCommunicator
    let eventBus: EventBus
    let identifier: IdentifierService
    let userService: UserService
    let userServiceClient: UserServiceClient
    let documentsService: DocumentsService
    let documentsExpirationService: DocumentsExpirationService

    beforeAll(async () => {
        app = await getApp()

        getDocumentsAction = app.container.build(GetDocumentsAction)
        external = app.container.resolve('external')
        eventBus = app.container.resolve<EventBus>('eventBus')
        identifier = app.container.resolve<IdentifierService>('identifier')
        userService = app.container.resolve<UserService>('userService')
        userServiceClient = app.container.resolve<UserServiceClient>('userServiceClient')
        documentsService = app.container.resolve<DocumentsService>('documentsService')
        documentsExpirationService = app.container.resolve<DocumentsExpirationService>('documentsExpirationService')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it.each([
        [
            PassportDocumentType.InternalPassport,
            (): unknown => jest.spyOn(external, 'receiveDirect').mockImplementationOnce(async () => getPassport()),
            idCard,
        ],
    ])('should return %s documents when exists', async (filter, setSpy, expectedDocument) => {
        // Arrange
        const docTypeResponse = documentsService.documentTypeToDocumentTypeResponse[filter]!
        const docType = documentsService.documentTypeResponseToDocumentType[docTypeResponse]
        const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const {
            session: {
                user: { identifier: userIdentifier },
            },
            headers,
        } = actionArgs
        const getUserDocumentSettingsSpy = jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: Object.values(PassportDocumentType).map((documentType) => ({
                documentType,
                documentIdentifiers: [],
            })),
            documentVisibilitySettings: [],
        })

        setSpy()

        const { id, docStatus, docNumber } = expectedDocument

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
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
                documentType: docType,
                headers,
                removeMissingDocuments: false,
                userIdentifier,
            })
            .mockImplementationOnce(async () => true)

        // Act
        const result = await getDocumentsAction.handler({
            ...actionArgs,
            params: { filter: [filter] },
        })

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

    it('should not return document that is not expired', async () => {
        // Arrange
        const actionArgs = testKit.session.getUserActionArguments({}, {}, { validItn: true })
        const filter = [PassportDocumentType.InternalPassport]
        const userDocumentsOrder: DocumentOrderSettingsItem[] = [
            { documentType: PassportDocumentType.InternalPassport, documentIdentifiers: [] },
        ]

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userServiceClient, 'getUserDocumentSettings').mockResolvedValueOnce({
            documentOrderSettings: userDocumentsOrder,
            documentVisibilitySettings: [],
        })
        jest.spyOn(userService, 'getDecryptedDataFromStorage').mockResolvedValue({
            [PassportDocumentType.InternalPassport]: [{ id: 'unique-doc-number' }],
        })
        jest.spyOn(documentsExpirationService, 'checkDocumentExpiration').mockReturnValueOnce({
            currentDate: new Date().toISOString(),
            expirationDate: new Date().toISOString(),
        })

        // Act
        const result = await getDocumentsAction.handler({ ...actionArgs, params: { filter } })

        // Assert
        expect(result).toEqual<ActionResult>({
            [documentsService.documentTypeToDocumentTypeResponse[PassportDocumentType.InternalPassport]!]: {
                status: HttpStatusCode.FORBIDDEN,
                data: [],
                currentDate: expect.any(String),
                expirationDate: expect.any(String),
            },
            documentsTypeOrder: [PassportDocumentTypeCamelCase.IdCard],
        })
    })
})
