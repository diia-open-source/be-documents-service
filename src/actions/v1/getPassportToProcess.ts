import { AppAction } from '@diia-inhouse/diia-app'

import { NotFoundError } from '@diia-inhouse/errors'
import { ActionVersion, SessionType } from '@diia-inhouse/types'
import { ValidationSchema } from '@diia-inhouse/validators'

import DocumentsService from '@services/documents'
import PassportService from '@services/passport'

import PassportDataMapper from '@dataMappers/passportDataMapper'

import { ActionResult, CustomActionArguments } from '@interfaces/actions/v1/getPassportToProcess'
import { Passport } from '@interfaces/providers/eis'

export default class GetPassportToProcessAction implements AppAction {
    constructor(
        private readonly documentsService: DocumentsService,
        private readonly passportService: PassportService,
        private readonly passportDataMapper: PassportDataMapper,
    ) {}

    readonly sessionType: SessionType = SessionType.User

    readonly actionVersion: ActionVersion = ActionVersion.V1

    readonly name: string = 'getPassportToProcess'

    readonly validationRules: ValidationSchema = {
        handlePhoto: { type: 'boolean', optional: true },
    }

    async handler(args: CustomActionArguments): Promise<ActionResult> {
        const {
            params: { handlePhoto },
            session: { user },
        } = args

        const passport: Passport | undefined = await this.passportService.getPassportToProcess(user)

        if (handlePhoto && passport) {
            const documentType = this.passportDataMapper.passportTypeToDocumentType[passport.type]

            await this.documentsService.handlePhotoForDocumentToProcess(user.identifier, documentType, passport)
        }

        if (!passport) {
            throw new NotFoundError('Passports not found')
        }

        return passport
    }
}
