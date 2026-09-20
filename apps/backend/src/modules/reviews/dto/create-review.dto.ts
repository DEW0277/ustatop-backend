import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ example: 'Usta ozoda va tez ishlaydi, tavsiya qilaman!' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  comment!: string;
}
