import { Module } from '@nestjs/common';
import { VinetasController } from './vinetas.controller';
import { VinetasService } from './vinetas.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provee AdminAuthGuard para @UseGuards en el controller
  controllers: [VinetasController],
  providers: [VinetasService],
})
export class VinetasModule {}
