import { AppAction } from '@diia-inhouse/diia-app'

import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'
import DocumentVerificationService from '@services/documentVerification'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/verifyDocumentByBarcode'

export default class VerifyDocumentByBarcodeAction implements AppAction {
    constructor(
        private readonly documentsService: DocumentsService,
        private readonly documentVerificationService: DocumentVerificationService,
    ) {
        this.validationRules = {
            documentType: { type: 'string', enum: this.documentsService.documentTypes },
            barcode: { type: 'string' },
            branchId: { type: 'objectId' },
        }
    }

    readonly sessionType: SessionType = SessionType.None

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'verifyDocumentByBarcode'

    readonly validationRules: ValidationSchema

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { barcode, documentType },
        } = args

        return await this.documentVerificationService.verifyDocumentByBarcode(documentType, barcode)
    }
}
