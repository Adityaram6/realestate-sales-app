import { ArrayMinSize, IsArray, IsObject, IsString } from "class-validator";

export class UpdateIntegrationDto {
  @IsObject()
  config!: Record<string, string>;
}

export class ReorderStagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIds!: string[];
}
