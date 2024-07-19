import { randomUUID } from 'node:crypto'

import { AuthService } from '@diia-inhouse/crypto'
import { mongo } from '@diia-inhouse/db'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocStatus, Icon, Localization, OwnerType, VerificationCodesOrg } from '@diia-inhouse/types'

import DocumentVerificationDataMapper from '@dataMappers/documentVerificationDataMapper'

import Utils from '@utils/index'

import { DocumentVerificationOtpModel } from '@interfaces/models/documentVerificationOtp'
import { ShareLinkResponse } from '@interfaces/services/documentVerification'

describe('DocumentVerificationDataMapper', () => {
    const testKit = new TestKit()
    const appUtilsMock = mockInstance(Utils)
    const authServiceMock = mockInstance(AuthService)
    const documentVerificationDataMapper = new DocumentVerificationDataMapper(appUtilsMock, authServiceMock)

    describe('method: `toVerifyOtpResponse`', () => {
        const verification = {
            requestorJWE: 'requestorJWE',
            documentId: randomUUID(),
            ownerType: OwnerType.owner,
            docStatus: DocStatus.Ok,
            localization: Localization.UA,
        }

        it('should successfully convert document verification otp model to verify otp response', async () => {
            const { user: requestor } = testKit.session.getUserSession()
            const { requestorJWE, docStatus, documentId, localization, ownerType } = verification

            jest.spyOn(authServiceMock, 'decodeToken').mockResolvedValueOnce(requestor)

            expect(await documentVerificationDataMapper.toVerifyOtpResponse(<DocumentVerificationOtpModel>verification)).toEqual({
                requestor,
                docId: documentId,
                ownerType,
                docStatus,
                localization,
            })

            expect(authServiceMock.decodeToken).toHaveBeenCalledWith(requestorJWE)
        })

        it('should fail with error in case is not unable to decode token', async () => {
            const { requestorJWE } = verification
            const expectedError = new Error('requestorJWE is not a valid token!')

            jest.spyOn(authServiceMock, 'decodeToken').mockResolvedValueOnce(null)
            jest.spyOn(appUtilsMock, 'throwInternalExceptionOnError').mockImplementationOnce((error: Error) => {
                throw error
            })

            await expect(async () => {
                await documentVerificationDataMapper.toVerifyOtpResponse(<DocumentVerificationOtpModel>verification)
            }).rejects.toEqual(expectedError)

            expect(authServiceMock.decodeToken).toHaveBeenCalledWith(requestorJWE)
            expect(appUtilsMock.throwInternalExceptionOnError).toHaveBeenCalledWith(expectedError)
        })
    })

    describe('method: `toShareOtpResponse`', () => {
        it('should successfully convert document verification otp model to verify otp response', async () => {
            const barcode = '12345678'
            const params = <ShareLinkResponse>(<unknown>{
                id: new mongo.ObjectId(1),
                link: randomUUID(),
                barcode,
                timerText: 'Код діятиме ще',
                timerTime: 180,
            })

            const result = documentVerificationDataMapper.toShareOtpResponse(params, Localization.UA)

            expect(result).toEqual<VerificationCodesOrg>({
                componentId: expect.any(String),
                UA: {
                    expireLabel: {
                        expireLabelFirst: params.timerText,
                        expireLabelLast: 'хв',
                        timer: 180,
                    },
                    qrCodeMlc: {
                        componentId: expect.any(String),
                        qrLink: params.link,
                    },
                    barCodeMlc: {
                        componentId: expect.any(String),
                        barCode: barcode,
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
                                            resource: String(params.id),
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
                                            resource: String(params.id),
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
            })
        })
    })
})
