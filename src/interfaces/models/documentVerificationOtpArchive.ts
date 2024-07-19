import { Document } from '@diia-inhouse/db'

import { DocumentVerificationOtp } from '@interfaces/models/documentVerificationOtp'

export type DocumentVerificationOtpArchive = DocumentVerificationOtp

export interface DocumentVerificationOtpArchiveModel extends DocumentVerificationOtpArchive, Document {}
