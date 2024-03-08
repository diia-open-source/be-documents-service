import { ExternalCommunicator, ExternalEvent } from '@diia-inhouse/diia-queue'
import TestKit from '@diia-inhouse/test'
import { DocumentType, Documents, HttpStatusCode } from '@diia-inhouse/types'

import GetDocumentsToProcessByItnAction from '@src/actions/v1/getDocumentsToProcessByItn'
import { getDriverLicense } from '@src/documents/driverLicense/providers/hsc/mockData'

import { photo } from '@providers/testData/photo'

import { getApp } from '@tests/utils/getApp'

describe(`Action ${GetDocumentsToProcessByItnAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: GetDocumentsToProcessByItnAction
    let external: ExternalCommunicator

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(GetDocumentsToProcessByItnAction)
        external = app.container.resolve('external')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it(`should return ${DocumentType.DriverLicense}`, async () => {
        // Arrange
        const headers = testKit.session.getHeaders()
        const itn = '900000499'
        const documentType = DocumentType.DriverLicense
        const registryResponse = getDriverLicense()
        const expectedDocument = testKit.docs.getDriverLicense({ id: `${registryResponse.driverLicense[0].id}`, photo })

        const receiveSpy = jest.spyOn(external, 'receiveDirect').mockResolvedValueOnce(registryResponse)

        // Act
        const result = await action.handler({
            headers,
            params: { documentTypes: [documentType], itn },
        })

        // Assert
        expect(receiveSpy).toHaveBeenCalledWith(ExternalEvent.RepoDocumentDriverLicense, { rnokpp: itn }, {})
        expect(result).toMatchObject<Documents<typeof documentType>>({
            [documentType]: {
                status: HttpStatusCode.OK,
                data: [expectedDocument],
            },
        })
    })
})
