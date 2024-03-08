import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, DocumentType, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentVerificationService from '@services/documentVerification'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getDocumentByBarcode'

export default class GetDocumentByBarcodeAction implements AppAction {
    constructor(private readonly documentVerificationService: DocumentVerificationService) {}

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getDocumentByBarcode'

    readonly validationRules: ValidationSchema = {
        documentType: { type: 'string', enum: Object.values(DocumentType) },
        barcode: { type: 'string' },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { documentType, barcode },
        } = args

        return await this.documentVerificationService.getDocumentByBarcode(documentType, barcode)
    }
}
