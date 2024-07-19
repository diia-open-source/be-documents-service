import { DepsFactoryFn, GrpcService, MoleculerService, asClass } from '@diia-inhouse/diia-app'

import {
    EventBus,
    EventMessageHandler,
    EventMessageValidator,
    ExternalCommunicator,
    ExternalCommunicatorChannel,
    ExternalEventBus,
    Queue,
    QueueDeps,
    ScheduledTask,
    Task,
} from '@diia-inhouse/diia-queue'
import TestKit, { mockClass } from '@diia-inhouse/test'

import deps from '@src/deps'

import { TestDeps } from '@tests/interfaces/utils'

import { AppDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'

export default async (config: AppConfig): ReturnType<DepsFactoryFn<AppConfig, AppDeps & TestDeps & QueueDeps>> => {
    return {
        ...(await deps(config)),

        testKit: asClass(TestKit).singleton(),
        queue: asClass(mockClass(Queue)).singleton(),
        scheduledTask: asClass(mockClass(ScheduledTask)).singleton(),
        eventBus: asClass(mockClass(EventBus)).singleton(),
        externalEventBus: asClass(mockClass(ExternalEventBus)).singleton(),
        task: asClass(mockClass(Task)).singleton(),
        external: asClass(ExternalCommunicator).singleton(),
        externalChannel: asClass(ExternalCommunicatorChannel).singleton(),
        eventMessageHandler: asClass(EventMessageHandler).singleton(),
        eventMessageValidator: asClass(EventMessageValidator).singleton(),
        moleculer: asClass(mockClass(MoleculerService)).singleton(),
        grpcService: asClass(mockClass(GrpcService)).singleton(),
    }
}
