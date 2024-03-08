import ArchiveUsedOtpTask from '@src/scheduledTasks/otpArchive'

import DocumentVerificationOtpService from '@services/documentVerificationOtp'

describe('ArchiveUsedOtpTask', () => {
    const documentVerificationOtpServiceMock = <DocumentVerificationOtpService>(<unknown>{
        archiveOtps: jest.fn(),
    })
    const archiveUsedOtpTask = new ArchiveUsedOtpTask(documentVerificationOtpServiceMock)

    describe('method: `handler`', () => {
        it('should call documentVerificationOtpService', async () => {
            await archiveUsedOtpTask.handler()
            expect(documentVerificationOtpServiceMock.archiveOtps).toHaveBeenCalled()
        })
    })
})
