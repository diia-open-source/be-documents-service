import DeleteUnusedOtpTask from '@src/scheduledTasks/deleteUnusedOtp'

import DocumentVerificationOtpService from '@services/documentVerificationOtp'

describe('DeleteUnusedOtpTask', () => {
    const documentVerificationOtpServiceMock = <DocumentVerificationOtpService>(<unknown>{
        deleteUnusedOtps: jest.fn(),
    })

    const deleteUnusedOtpTask = new DeleteUnusedOtpTask(documentVerificationOtpServiceMock)

    describe('method: `handler`', () => {
        it('should call documentVerificationOtpService', async () => {
            await deleteUnusedOtpTask.handler()

            expect(documentVerificationOtpServiceMock.deleteUnusedOtps).toHaveBeenCalled()
        })
    })
})
