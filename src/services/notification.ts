import { MoleculerService } from '@diia-inhouse/diia-app'

import { ActionVersion, Logger } from '@diia-inhouse/types'

import { CreateNotificationWithPushesByMobileUidParams, GetNotificationByResourceTypeResult } from '@interfaces/services/notification'

export default class NotificationService {
    private readonly serviceName = 'Notification'

    constructor(
        private readonly moleculer: MoleculerService,

        private readonly logger: Logger,
    ) {}

    async createNotificationWithPushesByMobileUid(
        params: CreateNotificationWithPushesByMobileUidParams,
    ): Promise<GetNotificationByResourceTypeResult> {
        return await this.moleculer.act(
            this.serviceName,
            {
                name: 'createNotificationWithPushesByMobileUid',
                actionVersion: ActionVersion.V1,
            },
            { params },
        )
    }

    async createNotificationWithPushesByMobileUidSafe(
        params: CreateNotificationWithPushesByMobileUidParams,
    ): Promise<GetNotificationByResourceTypeResult | void> {
        try {
            return await this.createNotificationWithPushesByMobileUid(params)
        } catch (err) {
            this.logger.fatal('Failed to exec createNotificationWithPushesByMobileUid', { err, params })
        }
    }
}
