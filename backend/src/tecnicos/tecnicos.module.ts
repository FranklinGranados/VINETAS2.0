import { Module } from '@nestjs/common';
import { TecnicosController } from './tecnicos.controller';
import { TecnicosService } from './tecnicos.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provee AdminAuthGuard para @UseGuards en el controller
  controllers: [TecnicosController],
  providers: [TecnicosService],
})
export class TecnicosModule {}
