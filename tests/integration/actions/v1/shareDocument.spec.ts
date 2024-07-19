import { randomUUID } from 'node:crypto'

import * as uuid from 'uuid'

import TestKit from '@diia-inhouse/test'
import { DocStatus, OwnerType } from '@diia-inhouse/types'

import ShareDocumentAction from '@src/actions/v1/shareDocument'

import DocumentsExpirationService from '@services/documentsExpiration'
import PassportService from '@services/passport'

import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v1/shareDocument'
import { PassportDocumentType } from '@interfaces/services/passport'

jest.mock('uuid', () => ({
    v4: jest.fn(() => randomUUID()),
}))

describe(`Action ${ShareDocumentAction.name}`, () => {
    const testKit = new TestKit()

    let app: Awaited<ReturnType<typeof getApp>>
    let action: ShareDocumentAction
    let documentsExpirationService: DocumentsExpirationService
    let passportService: PassportService

    beforeAll(async () => {
        app = await getApp()

        action = app.container.build(ShareDocumentAction)
        documentsExpirationService = app.container.resolve('documentsExpirationService')
        passportService = app.container.resolve('passportService')

        await app.start()
    })

    afterAll(async () => {
        await app.stop()
    })

    it('should generate share response', async () => {
        // Arrange
        const { session, headers } = testKit.session.getUserActionArguments({}, {}, { validItn: true })

        const hash = randomUUID()
        const documentId = randomUUID()
        const documentType = PassportDocumentType.ForeignPassport

        jest.spyOn(uuid, 'v4').mockReturnValueOnce(hash)
        jest.spyOn(passportService, 'assertDocumentIsValid').mockRejectedValueOnce(true)
        jest.spyOn(documentsExpirationService, 'getDocumentIdsExpiration').mockResolvedValue({
            statuses: {
                [documentId]: {
                    value: DocStatus.Ok,
                    ownerType: OwnerType.owner,
                },
            },
            date: new Date(),
        })

        // Act
        const result = await action.handler({
            session,
            headers,
            params: {
                documentId,
                documentType,
            },
        })

        // Assert
        expect(result).toEqual<ActionResult>({
            id: expect.any(String),
            link: `https://diia.app/documents/${documentType}/${documentId}/verify/${hash}`,
            timerText: expect.any(String),
            timerTime: 180,
            barcode: expect.any(String),
        })
    })
})
