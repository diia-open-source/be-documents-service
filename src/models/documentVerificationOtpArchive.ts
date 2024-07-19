import { Model, Schema, model, models } from '@diia-inhouse/db'

import { documentVerificationOtpSchema } from '@models/documentVerificationOtp'

import { DocumentVerificationOtpArchive } from '@interfaces/models/documentVerificationOtpArchive'

const documentVerificationOtpArchiveSchema: Schema<DocumentVerificationOtpArchive> = documentVerificationOtpSchema

export const skipSyncIndexes = true

export default <Model<DocumentVerificationOtpArchive>>models.DocumentVerificationOtpArchive ||
    model('DocumentVerificationOtpArchive', documentVerificationOtpArchiveSchema)
