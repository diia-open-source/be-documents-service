import { AppAction } from '@diia-inhouse/diia-app'

import { BadRequestError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getDocumentVerificationByBarcodeOrOtp'

export default class GetDocumentVerificationByBarcodeOrOtpAction implements AppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDocumentVerificationByBarcodeOrOtp'

    readonly validationRules: ValidationSchema<CustomActionArguments['params']> = {
        barcode: { type: 'string', optional: true },
        otp: { type: 'string', optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const { barcode, otp } = args.params
        if (barcode) {
            return await this.documentVerificationService.getValidatedVerificationRecordByBarcode(barcode)
        }

        if (otp) {
            return await this.documentVerificationService.getValidatedVerificationRecordByOtp(otp)
        }

        throw new BadRequestError('Should be one of: barcode or qrCode')
    }
}
