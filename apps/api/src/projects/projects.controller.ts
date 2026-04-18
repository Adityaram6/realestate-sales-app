import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import {
  CreateDocumentDto,
  CreateProjectDto,
  CreatePropertyDto,
  ProjectListFiltersDto,
  UpdateProjectDto,
  UpdatePropertyDto,
} from "./dto/project.dto";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";

@Controller()
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get("projects")
  list(@Query() filters: ProjectListFiltersDto) {
    return this.projects.list(filters);
  }

  @Get("projects/:id")
  get(@Param("id") id: string) {
    return this.projects.get(id);
  }

  @Post("projects")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projects.create(user.id, dto);
  }

  @Patch("projects/:id")
  update(@Param("id") id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @Delete("projects/:id")
  @HttpCode(200)
  remove(@Param("id") id: string) {
    return this.projects.softDelete(id);
  }

  @Get("projects/:id/properties")
  listProperties(@Param("id") id: string) {
    return this.projects.listProperties(id);
  }

  @Post("projects/:id/properties")
  createProperty(@Param("id") id: string, @Body() dto: CreatePropertyDto) {
    return this.projects.createProperty(id, dto);
  }

  @Patch("properties/:id")
  updateProperty(@Param("id") id: string, @Body() dto: UpdatePropertyDto) {
    return this.projects.updateProperty(id, dto);
  }

  @Post("projects/:id/documents")
  addDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.projects.addDocument(id, user.id, dto);
  }

  @Delete("documents/:id")
  @HttpCode(200)
  deleteDocument(@Param("id") id: string) {
    return this.projects.deleteDocument(id);
  }
}
