import { when } from 'jest-when'

import { IdentifierService } from '@diia-inhouse/crypto'
import { EventBus, ExternalCommunicator, InternalEvent } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { DocumentType, HttpStatusCode, OwnerType } from '@diia-inhouse/types'

import GetDocumentsAction from '@actions/v2/getDocuments'

import DocumentsService from '@services/documents'
import DocumentsExpirationService from '@services/documentsExpiration'
import UserService from '@services/user'

import { idCard } from '@tests/mocks/stubs/passport'
import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v2/getDocuments'
import { DocumentTypeResponse } from '@interfaces/services/documents'
import { UserProfileAddDocumentsMessage } from '@interfaces/services/user'

describe(`Action ${GetDocumentsAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let getDocumentsAction: GetDocumentsAction
    let external: ExternalCommunicator
    let eventBus: EventBus
    let identifier: IdentifierService
    let userService: UserService
    let documentsService: DocumentsService
    let documentsExpirationService: DocumentsExpirationService

    beforeAll(async () => {
        app = await getApp()

        getDocumentsAction = app.container.build(GetDocumentsAction)
        external = app.container.resolve('external')
        eventBus = app.container.resolve<EventBus>('eventBus')
        identifier = app.container.resolve<IdentifierService>('identifier')
        userService = app.container.resolve<UserService>('userService')
        documentsService = app.container.resolve<DocumentsService>('documentsService')
        documentsExpirationService = app.container.resolve<DocumentsExpirationService>('documentsExpirationService')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it.each([
        [
            DocumentType.InternalPassport,
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
        const getDocumentsOrderSpy = jest.spyOn(userService, 'getDocumentsOrder').mockImplementationOnce(async () =>
            Object.values(DocumentType).map((documentType) => ({
                documentType,
            })),
        )

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
        expect(getDocumentsOrderSpy).toHaveBeenCalledWith({ userIdentifier })

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
        const filter = [DocumentType.InternalPassport]
        const userDocumentsOrder = [{ documentType: DocumentType.InternalPassport }]

        jest.spyOn(userService, 'checkDocumentsFeaturePoints').mockResolvedValueOnce({ documents: [] })
        jest.spyOn(userService, 'getDocumentsOrder').mockResolvedValueOnce(userDocumentsOrder)
        jest.spyOn(userService, 'getDecryptedDataFromStorage').mockResolvedValue({
            [DocumentType.InternalPassport]: [{ id: 'unique-doc-number' }],
        })
        jest.spyOn(documentsExpirationService, 'checkDocumentExpiration').mockReturnValueOnce({
            currentDate: new Date().toISOString(),
            expirationDate: new Date().toISOString(),
        })

        // Act
        const result = await getDocumentsAction.handler({ ...actionArgs, params: { filter } })

        // Assert
        expect(result).toEqual<ActionResult>({
            [documentsService.documentTypeToDocumentTypeResponse[DocumentType.InternalPassport]!]: {
                status: HttpStatusCode.FORBIDDEN,
                data: [],
                currentDate: expect.any(String),
                expirationDate: expect.any(String),
            },
            documentsTypeOrder: [DocumentTypeResponse.IdCard],
        })
    })
})
