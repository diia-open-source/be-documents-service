import { Document } from 'mongoose'

import { DocumentVerificationOtp } from '@interfaces/models/documentVerificationOtp'

export type DocumentVerificationOtpArchive = DocumentVerificationOtp

export interface DocumentVerificationOtpArchiveModel extends DocumentVerificationOtpArchive, Document {}
