import { EventBusListener, ScheduledTaskEvent } from '@diia-inhouse/diia-queue'

import DocumentVerificationOtpService from '@services/documentVerificationOtp'

export default class ArchiveUsedOtpTask implements EventBusListener {
    constructor(private documentVerificationOtpService: DocumentVerificationOtpService) {}

    readonly event: ScheduledTaskEvent = ScheduledTaskEvent.DocumentsArchiveUsedOtp

    async handler(): Promise<void> {
        await this.documentVerificationOtpService.archiveOtps()
    }
}
