import { DocStatus, DocumentType, OwnerType } from '@diia-inhouse/types'

import { DocumentVerificationOtp } from '@interfaces/models/documentVerificationOtp'

export const getDocumentVerificationOtpResponse = (
    userIdentifier: string,
    registryDocumentType: DocumentType,
    expirationDate = new Date(),
): DocumentVerificationOtp => ({
    userIdentifier,
    documentId: 'documentId',
    requestorJWE: 'requestorJWE',
    registryDocumentType,
    hash: 'hash',
    ownerType: OwnerType.owner,
    docStatus: DocStatus.Ok,
    expirationDate,
})
