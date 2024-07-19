import { DepsFactoryFn, GrpcClientFactory, NameAndRegistrationPair, asClass, asFunction } from '@diia-inhouse/diia-app'

import { AnalyticsService } from '@diia-inhouse/analytics'
import { AuthService, CryptoDeps, CryptoService, HashService, IdentifierService } from '@diia-inhouse/crypto'
import { HttpDeps, HttpService } from '@diia-inhouse/http'
import { I18nService } from '@diia-inhouse/i18n'
import { CacheService, PubSubService, RedisDeps, RedlockService, StoreService } from '@diia-inhouse/redis'
import { HttpProtocol } from '@diia-inhouse/types'
import { UserServiceDefinition } from '@diia-inhouse/user-service-client'

import Utils from './utils'

import { getProvidersDeps as getDocumentsProvidersDeps } from '@src/documents/deps'

import { getProvidersDeps } from '@providers/index'

import { AppDeps, GrpcClientsDeps, InternalDeps } from '@interfaces/application'
import { AppConfig } from '@interfaces/config'

export default async (config: AppConfig): ReturnType<DepsFactoryFn<AppConfig, AppDeps>> => {
    const {
        redis,
        store,
        auth,
        identifier,
        grpc: { userServiceAddress },
    } = config

    const providersDeps = {
        ...getProvidersDeps(config),
        ...getDocumentsProvidersDeps(config),
    }
    const internalDeps: NameAndRegistrationPair<InternalDeps> = {
        appUtils: asClass(Utils).singleton(),
    }

    const cryptoDeps: NameAndRegistrationPair<CryptoDeps> = {
        auth: asClass(AuthService, { injector: () => ({ authConfig: auth }) }).singleton(),
        identifier: asClass(IdentifierService, { injector: () => ({ identifierConfig: identifier }) }).singleton(),
        crypto: asClass(CryptoService).singleton(),
        hash: asClass(HashService).singleton(),
    }

    const redisDeps: NameAndRegistrationPair<RedisDeps> = {
        cache: asClass(CacheService, { injector: () => ({ redisConfig: redis }) }).singleton(),
        pubsub: asClass(PubSubService, { injector: () => ({ redisConfig: redis }) }).singleton(),
        store: asClass(StoreService, { injector: () => ({ storeConfig: store }) }).singleton(),
        redlock: asClass(RedlockService, { injector: () => ({ storeConfig: store }) }).singleton(),
    }

    const httpDeps: NameAndRegistrationPair<HttpDeps> = {
        httpService: asClass(HttpService, { injector: () => ({ protocol: HttpProtocol.Http }) }).singleton(),
        httpsService: asClass(HttpService, { injector: () => ({ protocol: HttpProtocol.Https }) }).singleton(),
    }

    const grpcClientsDeps: NameAndRegistrationPair<GrpcClientsDeps> = {
        userServiceClient: asFunction((grpcClientFactory: GrpcClientFactory) =>
            grpcClientFactory.createGrpcClient(UserServiceDefinition, userServiceAddress),
        ).singleton(),
    }

    return {
        i18n: asClass(I18nService).singleton(),
        analytics: asClass(AnalyticsService).singleton(),
        ...grpcClientsDeps,
        ...providersDeps,
        ...internalDeps,
        ...cryptoDeps,
        ...httpDeps,
        ...redisDeps,
    }
}
