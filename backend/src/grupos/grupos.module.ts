import { Module } from '@nestjs/common';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provee AdminAuthGuard para @UseGuards en el controller
  controllers: [GruposController],
  providers: [GruposService],
})
export class GruposModule {}
