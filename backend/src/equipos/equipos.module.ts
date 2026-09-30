import { Module } from '@nestjs/common';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provee AdminAuthGuard para @UseGuards en el controller
  controllers: [EquiposController],
  providers: [EquiposService],
})
export class EquiposModule {}
