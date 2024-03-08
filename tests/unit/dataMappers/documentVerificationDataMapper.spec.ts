import { randomUUID } from 'crypto'

import { AuthService } from '@diia-inhouse/crypto'
import TestKit, { mockInstance } from '@diia-inhouse/test'
import { DocStatus, Localization, OwnerType } from '@diia-inhouse/types'

import DocumentVerificationDataMapper from '@dataMappers/documentVerificationDataMapper'

import Utils from '@utils/index'

import { DocumentVerificationOtpModel } from '@interfaces/models/documentVerificationOtp'

describe('DocumentVerificationDataMapper', () => {
    const testKit = new TestKit()
    const appUtilsMock = mockInstance(Utils)
    const authServiceMock = mockInstance(AuthService)
    const documentVerificationDataMapper = new DocumentVerificationDataMapper(appUtilsMock, authServiceMock)

    describe('method: `toVerifyOtpResponse`', () => {
        const verification = {
            requestorJWE: 'requestorJWE',
            documentId: randomUUID(),
            ownerType: OwnerType.owner,
            docStatus: DocStatus.Ok,
            localization: Localization.UA,
        }

        it('should successfully convert document verification otp model to verify otp response', async () => {
            const { user: requestor } = testKit.session.getUserSession()
            const { requestorJWE, docStatus, documentId, localization, ownerType } = verification

            jest.spyOn(authServiceMock, 'decodeToken').mockResolvedValueOnce(requestor)

            expect(await documentVerificationDataMapper.toVerifyOtpResponse(<DocumentVerificationOtpModel>verification)).toEqual({
                requestor,
                docId: documentId,
                ownerType,
                docStatus,
                localization,
            })

            expect(authServiceMock.decodeToken).toHaveBeenCalledWith(requestorJWE)
        })

        it('should fail with error in case is not unable to decode token', async () => {
            const { requestorJWE } = verification
            const expectedError = new Error('requestorJWE is not a valid token!')

            jest.spyOn(authServiceMock, 'decodeToken').mockResolvedValueOnce(null)
            jest.spyOn(appUtilsMock, 'throwInternalExceptionOnError').mockImplementationOnce((error: Error) => {
                throw error
            })

            await expect(async () => {
                await documentVerificationDataMapper.toVerifyOtpResponse(<DocumentVerificationOtpModel>verification)
            }).rejects.toEqual(expectedError)

            expect(authServiceMock.decodeToken).toHaveBeenCalledWith(requestorJWE)
            expect(appUtilsMock.throwInternalExceptionOnError).toHaveBeenCalledWith(expectedError)
        })
    })
})
