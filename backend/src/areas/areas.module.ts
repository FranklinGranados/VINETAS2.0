import { Module } from '@nestjs/common';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { SubAreasController } from './sub-areas.controller';
import { SubAreasService } from './sub-areas.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provee AdminAuthGuard para @UseGuards en los controllers
  controllers: [AreasController, SubAreasController],
  providers: [AreasService, SubAreasService],
})
export class AreasModule {}
