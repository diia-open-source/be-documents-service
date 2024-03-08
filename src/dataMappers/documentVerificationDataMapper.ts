import { AuthService } from '@diia-inhouse/crypto'
import { UserTokenData } from '@diia-inhouse/types'

import Utils from '@utils/index'

import { DocumentVerificationOtpModel } from '@interfaces/models/documentVerificationOtp'
import { VerifyOtpResponse } from '@interfaces/services/documentVerification'

export default class DocumentVerificationDataMapper {
    constructor(
        private readonly appUtils: Utils,
        private readonly auth: AuthService,
    ) {}

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
