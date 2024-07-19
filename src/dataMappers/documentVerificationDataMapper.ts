import { AuthService } from '@diia-inhouse/crypto'
import { Icon, Localization, UserTokenData, VerificationCode, VerificationCodesOrg } from '@diia-inhouse/types'

import Utils from '@utils/index'

import { DocumentVerificationOtpModel } from '@interfaces/models/documentVerificationOtp'
import { ShareLinkResponse, VerifyOtpResponse } from '@interfaces/services/documentVerification'

export default class DocumentVerificationDataMapper {
    readonly timerTextByLocalization: Record<Localization, string> = {
        [Localization.UA]: 'Код діятиме ще',
        [Localization.ENG]: 'The code will expire in',
    }

    private readonly stubExpireTitle: Record<Localization, string> = {
        [Localization.UA]: 'Час дії коду закінчився',
        [Localization.ENG]: 'Code expired',
    }

    private readonly stubUpdateTitle: Record<Localization, string> = {
        [Localization.UA]: 'Оновити код',
        [Localization.ENG]: 'Refresh code',
    }

    private readonly qrCodeBtn: Record<Localization, string> = {
        [Localization.UA]: 'QR-код',
        [Localization.ENG]: 'QR-code',
    }

    private readonly barcodeBtn: Record<Localization, string> = {
        [Localization.UA]: 'Штрихкод',
        [Localization.ENG]: 'Barcode',
    }

    private readonly timePostfixValue: Record<Localization, string> = {
        [Localization.UA]: 'хв',
        [Localization.ENG]: 'min',
    }

    constructor(
        private readonly appUtils: Utils,
        private readonly auth: AuthService,
    ) {}

    toShareOtpResponse(params: ShareLinkResponse, localization: Localization): VerificationCodesOrg {
        const { timerText, timerTime, link, barcode, id } = params
        const resourceId = String(id)

        const verificationObject: VerificationCode = {
            expireLabel: {
                expireLabelFirst: timerText,
                expireLabelLast: this.timePostfixValue[localization],
                timer: timerTime,
            },
            qrCodeMlc: {
                componentId: 'qr',
                qrLink: link,
            },
            ...(barcode
                ? {
                      barCodeMlc: {
                          componentId: 'bar_code',
                          barCode: barcode,
                      },
                  }
                : {}),
            toggleButtonGroupOrg: {
                componentId: 'toggle_button_group',
                preselected: 'qr',
                items: [
                    {
                        btnToggleMlc: {
                            componentId: 'btn_toggle_qr',
                            code: 'qr',
                            label: this.qrCodeBtn[localization],
                            selected: {
                                icon: Icon.qrWhite,
                                action: {
                                    type: 'qr',
                                    subtype: '',
                                    resource: resourceId,
                                },
                            },
                            notSelected: {
                                icon: Icon.qr,
                            },
                        },
                    },
                    {
                        btnToggleMlc: {
                            componentId: 'btn_toggle_barcode',
                            code: 'barcode',
                            label: this.barcodeBtn[localization],
                            selected: {
                                icon: Icon.barcodeWhite,
                                action: {
                                    type: 'barcode',
                                    subtype: '',
                                    resource: resourceId,
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
                componentId: 'stub_message_verification',
                icon: '☝',
                title: this.stubExpireTitle[localization],
                btnStrokeAdditionalAtm: {
                    label: this.stubUpdateTitle[localization],
                    action: {
                        type: 'refresh',
                    },
                },
                parameters: [],
            },
        }

        const isEngLocale = localization === Localization.ENG

        return {
            componentId: 'verification_codes',
            ...(isEngLocale ? { EN: verificationObject } : { UA: verificationObject }),
        }
    }

    async toVerifyOtpResponse(verification: DocumentVerificationOtpModel): Promise<VerifyOtpResponse> {
        const requestor = <UserTokenData>await this.auth.decodeToken(verification.requestorJWE)
        if (!requestor?.itn) {
            this.appUtils.throwInternalExceptionOnError(new Error('requestorJWE is not a valid token!'))
        }

        return {
            requestor,
            docId: verification.documentId,
            ownerType: verification.ownerType,
            docStatus: verification.docStatus,
            localization: verification.localization,
        }
    }
}
