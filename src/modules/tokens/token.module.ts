import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonAppModule } from 'src/common.app.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { EsdtToken, EsdtTokenSchema } from './schemas/token.schema';
import { TokenService } from './services/token.service';
import { TokensResolver } from './token.resolver';

@Module({
    imports: [
        ElrondCommunicationModule,
        RouterModule,
        PairModule,
        MongooseModule.forRootAsync({
            imports: [CommonAppModule],
            useFactory: async (configService: ApiConfigService) => ({
                uri: `${configService.getMongoDBURL()}`,
                dbName: configService.getMongoDBDatabase(),
                user: configService.getMongoDBUsername(),
                pass: configService.getMongoDBPassword(),
                tlsAllowInvalidCertificates: true,
            }),
            inject: [ApiConfigService],
        }),
        MongooseModule.forFeature([
            { name: EsdtToken.name, schema: EsdtTokenSchema },
        ]),
    ],
    providers: [TokenService, TokensResolver],
})
export class TokenModule {}
