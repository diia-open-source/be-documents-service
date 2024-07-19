import { EventBusListener } from '@diia-inhouse/diia-queue'

import DocumentVerificationOtpService from '@services/documentVerificationOtp'

import { ScheduledTaskEvent } from '@interfaces/queue'

export default class DeleteUnusedOtpTask implements EventBusListener {
    constructor(private documentVerificationOtpService: DocumentVerificationOtpService) {}

    readonly event: ScheduledTaskEvent = ScheduledTaskEvent.DocumentsDeleteUnusedOtp

    async handler(): Promise<void> {
        await this.documentVerificationOtpService.deleteUnusedOtps()
    }
}
