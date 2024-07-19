import { GrpcClientFactory } from '@diia-inhouse/diia-app'

import DiiaLogger from '@diia-inhouse/diia-logger'
import { MetricsService } from '@diia-inhouse/diia-metrics'
import { mockInstance } from '@diia-inhouse/test'
import { UserServiceDefinition } from '@diia-inhouse/user-service-client'

const grpcClientFactory = new GrpcClientFactory('Documents', new DiiaLogger(), mockInstance(MetricsService))

export const userServiceClient = grpcClientFactory.createGrpcClient(UserServiceDefinition, 'test')
