import { randomUUID } from 'node:crypto'

import * as uuid from 'uuid'

import TestKit from '@diia-inhouse/test'
import { DocStatus, Icon, OwnerType } from '@diia-inhouse/types'

import ShareDocumentAction from '@src/actions/v2/shareDocument'

import DocumentsExpirationService from '@services/documentsExpiration'
import PassportService from '@services/passport'

import { getApp } from '@tests/utils/getApp'

import { ActionResult } from '@interfaces/actions/v2/shareDocument'
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
            verificationCodesOrg: {
                componentId: expect.any(String),
                UA: {
                    expireLabel: {
                        expireLabelFirst: expect.any(String),
                        expireLabelLast: 'хв',
                        timer: 180,
                    },
                    qrCodeMlc: {
                        componentId: 'qr',
                        qrLink: `https://diia.app/documents/${documentType}/${documentId}/verify/${hash}`,
                    },
                    barCodeMlc: {
                        componentId: expect.any(String),
                        barCode: expect.any(String),
                    },
                    toggleButtonGroupOrg: {
                        componentId: expect.any(String),
                        preselected: 'qr',
                        items: [
                            {
                                btnToggleMlc: {
                                    componentId: expect.any(String),
                                    code: 'qr',
                                    label: 'QR-код',
                                    selected: {
                                        icon: Icon.qrWhite,
                                        action: {
                                            type: 'qr',
                                            subtype: '',
                                            resource: expect.any(String),
                                        },
                                    },
                                    notSelected: {
                                        icon: Icon.qr,
                                    },
                                },
                            },
                            {
                                btnToggleMlc: {
                                    componentId: expect.any(String),
                                    code: 'barcode',
                                    label: 'Штрихкод',
                                    selected: {
                                        icon: Icon.barcodeWhite,
                                        action: {
                                            type: 'barcode',
                                            subtype: '',
                                            resource: expect.any(String),
                                        },
                                    },
                                    notSelected: {
                                        icon: Icon.barcode,
                                    },
                                },
                            },
                        ],
                    },
                    stubMessageMlc: {
                        componentId: expect.any(String),
                        icon: expect.any(String),
                        title: expect.any(String),
                        btnStrokeAdditionalAtm: {
                            label: 'Оновити код',
                            action: {
                                type: 'refresh',
                            },
                        },
                        parameters: [],
                    },
                },
            },
        })
    })
})
