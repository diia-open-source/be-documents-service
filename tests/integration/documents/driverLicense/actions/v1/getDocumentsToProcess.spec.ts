import { ExternalCommunicator } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { DocumentType, HttpStatusCode } from '@diia-inhouse/types'

import { DriverLicenseDocumentDTO } from '@src/documents/driverLicense/interfaces/providers/hsc'
import { getDriverLicense } from '@src/documents/driverLicense/providers/hsc/mockData'

import GetDocumentsToProcessAction from '@actions/v1/getDocumentsToProcess'

import DocumentsService from '@services/documents'

import { getPassport } from '@tests/mocks/stubs/providers/eis/passport'
import { getApp } from '@tests/utils/getApp'

describe(`Action ${GetDocumentsToProcessAction.name}`, () => {
    process.env.EDDR_IS_ENABLED = 'true'

    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetDocumentsToProcessAction
    let external: ExternalCommunicator
    let documentsService: DocumentsService

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetDocumentsToProcessAction)
        external = app.container.resolve('external')
        documentsService = app.container.resolve('documentsService')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it(`should return %s`, async () => {
        // Arrange
        const documentFilter = DocumentType.DriverLicense
        const { session, headers } = testKit.session.getUserActionArguments()
        const documentTypeResponse = documentsService.documentTypeToDocumentTypeResponse[documentFilter]!
        const { unzr: recordNumber } = getPassport()
        const expectedDocuments = [
            testKit.docs.getDriverLicense({
                id: `${getDriverLicense().driverLicense[0].id}`,
                recordNumber,
                ua: { identifier: { value: recordNumber } },
                eng: { identifier: { value: recordNumber } },
            }),
        ]

        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(getPassport())
        jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(
            getDriverLicense({ driverLicense: [<DriverLicenseDocumentDTO>{ photo: '' }] }),
        )

        // Act
        const result = await action.handler({
            session,
            headers,
            params: { filter: [documentFilter] },
        })

        // Assert
        expect(result).toEqual({
            [documentTypeResponse]: {
                status: HttpStatusCode.OK,
                data: expectedDocuments,
            },
        })
    })
})
