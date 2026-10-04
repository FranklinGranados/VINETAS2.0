import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdministradoresController } from './administradores.controller';
import { AdministradoresService } from './administradores.service';

@Module({
  // AuthModule exporta AdminAuthGuard (y el JwtModule que este necesita).
  imports: [AuthModule],
  controllers: [AdministradoresController],
  providers: [AdministradoresService],
})
export class AdministradoresModule {}
