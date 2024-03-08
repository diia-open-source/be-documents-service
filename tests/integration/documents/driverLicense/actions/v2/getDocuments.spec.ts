import { when } from 'jest-when'

import { IdentifierService } from '@diia-inhouse/crypto'
import { EventBus, InternalEvent } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { DocumentType, HttpStatusCode, OwnerType } from '@diia-inhouse/types'

import DriverLicenseHscProvider from '@src/documents/driverLicense/providers/hsc'
import { getDriverLicense } from '@src/documents/driverLicense/providers/hsc/mockData'

import GetDocumentsAction from '@actions/v2/getDocuments'

import DocumentsService from '@services/documents'
import UserService from '@services/user'

import { photo } from '@providers/testData/photo'

import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v2/getDocuments'
import { UserProfileAddDocumentsMessage } from '@interfaces/services/user'

describe(`Action ${GetDocumentsAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let getDocumentsAction: GetDocumentsAction
    let eventBus: EventBus
    let identifier: IdentifierService
    let driverLicenseHscProvider: DriverLicenseHscProvider
    let userService: UserService
    let documentsService: DocumentsService

    beforeAll(async () => {
        app = await getApp()

        getDocumentsAction = app.container.build(GetDocumentsAction)
        eventBus = app.container.resolve<EventBus>('eventBus')
        identifier = app.container.resolve<IdentifierService>('identifier')
        driverLicenseHscProvider = app.container.resolve<DriverLicenseHscProvider>('driverLicenseHscProvider')
        userService = app.container.resolve<UserService>('userService')
        documentsService = app.container.resolve<DocumentsService>('documentsService')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it.each([
        [
            DocumentType.DriverLicense,
            (): unknown => jest.spyOn(driverLicenseHscProvider, 'getDriverLicense').mockResolvedValueOnce(getDriverLicense()),
            testKit.docs.getDriverLicense({ id: `${getDriverLicense().driverLicense[0].id}`, photo }),
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
})
