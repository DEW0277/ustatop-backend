import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

// JwtAuthGuard (AuthGuard('jwt')) har qanday moduldan foydalanishi mumkin bo'lishi uchun
// PassportModule.register(...) shu yerda BIR MARTA, global qilib ro'yxatga olinadi.
// Aks holda har bir uni ishlatuvchi modul (masalan RegionsModule) o'zi ham PassportModule'ni
// import qilishi kerak bo'lardi — bu takrorlanish va oson unutiladigan xatoga olib keladi.
@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  exports: [PassportModule],
})
export class SharedAuthModule {}
