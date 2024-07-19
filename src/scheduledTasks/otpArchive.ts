import { EventBusListener } from '@diia-inhouse/diia-queue'

import DocumentVerificationOtpService from '@services/documentVerificationOtp'

import { ScheduledTaskEvent } from '@interfaces/queue'

export default class ArchiveUsedOtpTask implements EventBusListener {
    constructor(private documentVerificationOtpService: DocumentVerificationOtpService) {}

    readonly event: ScheduledTaskEvent = ScheduledTaskEvent.DocumentsArchiveUsedOtp

    async handler(): Promise<void> {
        await this.documentVerificationOtpService.archiveOtps()
    }
}
